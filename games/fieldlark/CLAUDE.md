# Fieldlark — working notes (read this first when resuming)

A 3D farm-building and management game for ages 8–14, for AI Kids Games. **Fieldlark** (slug `fieldlark`,
storage prefix `fieldlark.`, hook `__fieldlark`) is the owner's pick of 2026-10-14; until then it was
built under the working name "Farm WIP" (slug `farm-wip`, prefix `farmwip.`; no player saves existed).
Brief: `docs/prompts/fieldlark.md`. Approved plan (2026-10-13):
`games/fieldlark/docs/PLAN.md`, which holds the full game design, architecture and the 13 phases.
The second plan (owner-approved 2026-10-14, phases 7–15 and ten new mechanics) is `docs/PLAN-2.md`.

**Resume:** "Continue the farm game from CLAUDE.md" → read this file, then **Progress**, and carry on from
"Next".

## Workspace (other sessions are active)
- Own git worktree: `~/Documents/FarmerTown/AI-Kids-Games-farm`, branch `fieldlark` (was `farm-wip`), cut from
  `origin/main` f331dd9 (release 2.7.0, Agentmon). The branch has no upstream. Push or open a PR only
  when the owner asks.
- **Release (owner, 2026-10-14, the "finish end to end" brief; replaces the same day's earlier "deploy
  to production when complete"):** finish the game (plan: `docs/PLAN-2.md`), rename it to the owner's
  pick, import it into the site, open a PR, get CI green and hand over the preview link. **Stop
  before production:** the owner plays it and approves the release. Run the full browser suites
  against previews, never production. When the owner later approves, release by the repo's path
  (root CLAUDE.md):
  1. version bump with the DEPLOYMENT.json approval quoting this message;
  2. `release:local` on a quiet machine;
  3. CI green;
  4. AIKG_ALLOW_PRODUCTION in Vercel Production;
  5. merge to main;
  6. production checks and a record PR.
- The main checkout `~/Documents/AI-Kids-Games` belongs to another session (branch
  `game-trailers`). Never touch that checkout or other sessions' worktrees.
- **Heavy runs:** `node games/fieldlark/scripts/quiet-check.mjs` before any browser test, Vitest run,
  capture or long simulation. **Respect its exit code:** 0 means quiet, so go ahead; 1 means busy, so
  wait and don't start; with `--wait`, a non-zero exit after 2 hours means stop and tell the owner.
  `sh scripts/when-quiet.sh e2e|sim …` (from games/fieldlark) waits, then runs. It exits 75 if the
  machine is still busy after 2 hours. The quiet check counts Vitest as heavy, so unit tests wait too.
  Never run unit and browser tests at the same time, and never run CPU- or GPU-heavy work while
  another session's e2e is running.
- **Disk:** run `df -h ~` at the start of every phase. Under 2 GB: clean only our own regenerable
  files (test-results, dist, playwright-report). If it is still under, stop and ask.
- Before every commit: check `git log` for commits this session didn't make. Commit messages are
  "Fieldlark, phase N: …", with a `Tests:` line and the trailer
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rules that never change
- One self-contained `dist/index.html` under **3 MiB** (`scripts/check-build.mjs`; aim for about
  1.8 MB). It works from file:// and in the site's sandboxed iframe, with **no network requests**
  (build CSP + check).
- Storage: only keys starting `fieldlark.` (save, settings, probe `fieldlark.__probe`). Never
  `localStorage.clear()`, never enumerate other keys. Saves are versioned and migrated. The prefix
  changes once, at the rename in phase 11, before any player has a save.
- **Kindness rules** (from the brief; tested):
  - no energy and no real-world timers: the clock runs only while the farm is on screen and active;
  - nothing wilts, spoils, dies or gets sick, and animals are always fine;
  - "while you were away" is capped at 10 minutes of growth and only helps;
  - no premium currency, purchases, ads, accounts, chat, sharing or network;
  - no streaks and no red dots;
  - the safety net means nobody is ever stuck broke.
- **Different from Cliff Valley:**
  - a 3D diorama with no avatar, energy, mining, inherited farm or train;
  - its own crops (only Wheat, Strawberry and Pumpkin overlap), buildings, cast and look.
- **Originality:**
  - no names, characters, art, UI layouts, currencies or text from the inspiration or its publisher
    (both are on the trademark blocklist);
  - every name is web-checked, and every design is reviewed for lookalikes (IP log below);
  - all models are built in code, all audio is synthesized, and there are no asset files.
- `site.status` stays **"In development"** until the site step (phase 12).
- Read-aloud uses only local speech voices (`localService`), because cloud voices would send text
  over the network.
- Three.js is pinned at exactly **0.186.1**, like the other 3D games.
- The sim (`src/sim/`) is pure: no DOM, no `Date`, no `Math.random`. It uses a seeded RNG, and a
  purity test enforces this.

## Commands (from the repo root of the worktree)
```bash
npm run typecheck --workspace games/fieldlark
node games/fieldlark/scripts/quiet-check.mjs && npm test --workspace games/fieldlark
npm run build --workspace games/fieldlark       # typecheck + single-file build + contract check
(cd games/fieldlark && sh scripts/when-quiet.sh e2e)   # browser tests, once quiet
npm run dev --workspace games/fieldlark         # http://127.0.0.1:5769
npm run check                                  # repo hygiene + build sync (root)
```
Ports: dev 5769, preview 4769 (from the slug `fieldlark`; were 5446/4446 as farm-wip). They don't collide with any other
game's. Tuck Pop is 4444/5444.

## Architecture
(The full design is in `docs/PLAN.md`.)

**`src/sim/`** is pure: no DOM, `Date` or `Math.random`, checked by `tests/unit/purity.test.ts`.
- `map.ts`: the fixed 56×56 land. Areas, terrace levels with smoothed corners, water, and `topY`
  (where a tap meets a tile).
- `clock.ts`: play-time days (8 min) and seasons (6 days).
- `state.ts`: the `Farm` JSON, which is the save.
- `objects.ts`: footprints and `canPlace`.
- `world.ts`: occupancy, `objAt`, levels, and the ledger (`earn` and `spend`).
- `fields.ts`: plough, plant, water, compost, harvest, clear clutter, and care → stars.
- `inventory.ts`: the barn, by stars.
- `market.ts`: seasonal prices; more stars always pay more.
- `weather.ts`: rain days.
- `tick.ts`: `advance` (rain watering, the compost bin, level-ups, the safety net), `stuck`, and
  `catchUp` (the away bonus).

**`src/data/`**
- `crops.ts`: 30 crops.
- `facts.ts`: every real fact, with a `check`.
- `items.ts`, `buildings.ts`, `start.ts` (the starting farm and its clutter), `orchard.ts`
  (phase 3 data).
- `tuning.ts`: every balance number, and the XP curve.

**`src/render/`**: Three.js.
- `view.ts`: renderer, scene, eased camera, and picking with tall boxes.
- `camera.ts`: pure camera math (zoom in px per tile, view offset to the open area).
- `terrain.ts`, `water.ts`, `scenery.ts`, `lighting.ts` (day to dusk, rim colour, sky CSS vars).
- `objects.ts`: instanced fields, crops, buildings and clutter.
- `quality.ts`: tiers and the governor.
- `models/`: `nature`, `crops` (30 × 4 stages), `buildings`.

**`src/input/`**
- `gestures.ts`: tap, drag, pinch, twist, wheel and hover.
- `controller.ts`: camera moves, keys, the gamepad tile cursor, and drag painting.
- `pick.ts`: DDA tile picking, `rayBox`, and generous `pickNear`.
- `gamepad.ts`

**`src/game/play.ts`**: the tools (hand, plough, seeds, water, compost, barn) and what a tap or a
drag does with each.

**`src/ui/`**
- `h.ts`: a tiny DOM helper.
- `panels.ts`: the panel stack, toasts, focus navigation, and the ghost-click shield.
- `hud.ts`, `layout.ts` (HUD sizes and the supported viewports).
- `settingsPanel.ts`, `seedsPanel.ts`, `barnPanel.ts`.
- `icons.ts` and `itemIcons.ts`: SVG drawn in code.
- `speech.ts`: local voices only.

**Other**
- `src/save/`: storage, `save.ts` (versioned decode/repair, with `savedAt` for the away bonus), and
  `settings.ts`.
- `src/audio/engine.ts`: Web Audio, limiter, and interface and farming sounds.
- `src/main.ts`: boot, the loop, saving, sim events, the test hook and the capture route.

**Phases 3–6 modules**
- `sim/animals.ts`: homes, feeding, brushing, hearts, products and bees (`hiveNear`, `flowersNear`).
- `sim/trees.ts`: orchards that rest out of season.
- `sim/build.ts`: buy and place.
- `sim/production.ts`: workshop queues, the shelf and upgrades.
- `sim/decorate.ts`: paths (one character per tile in `farm.paths`), painted fences and flowers,
  move, put away into `farm.storage`, `UndoStack`, land and beauty.
- `sim/orders.ts`: the board, `obtainable`, and the boat.
- `sim/neighbors.ts`: trades, the co-op and visits.
- `game/placing.ts`: one ghost flow for buying, decorations, storage and moving.
- `render/`: `animals.ts` (wandering animals, bees, billboard ready-signs), `town.ts` (the Little
  Lark and visitors), `ghost.ts`, and `models/` (`trees`, `animals`, `workshops`, `decor`, `town`).
- `ui/`: `homePanel`, `workshopPanel`, `shopPanel`, `buildPanels`, `townPanel`.

**Data:** `data/animals.ts`, `orchard.ts`, `production.ts` (7 workshops, 43 recipes; goods are priced
from their ingredients in `items.ts`), `decor.ts` (decorations, paths, sets, land, beauty tiers) and
`cast.ts`.

**Stats:** `farm.stats` holds lifetime counters (`bump` in `world.ts`) that story goals read.

**URL switches** (none of them saves anything unless you play normally):
- `?scene=title|farm|showcase`, with `&seed=&t=&yaw=&zoom=&x=&z=`: capture route, never saves.
  `showcase` is a staged grown-up farm (`game/showcase.ts`).
- `?quality=low|medium|high`
- `?speed=N` (1–120): faster farm time, for tests.

## Decisions (small calls the plan didn't cover; newest last)
- 2026-10-13: the brief stopped at "…seasonal looks". The owner chose the plan's defaults:
  - 60 fps on mid-range phones, with tiers + governor;
  - a build of at most 3 MiB;
  - Chromium + WebKit e2e;
  - a playthrough bot;
  - stop before the production release.
- 2026-10-13: the delivery vehicle is a little **river boat**, not a cart or a train. Cliff Valley
  has a train, and a river already runs along the starting plot.
- 2026-10-13: the currency is plain **coins**, as the brief says, with an original coin design: a
  wheat-sheaf stamp.
- 2026-10-13 (phase 1):
  - **Zoom** is pixels per tile at the screen's middle: 12–72, default 38. 72 keeps a tile at
    least 59 px tall.
  - **Camera:** tilt 55°, field of view 30°.
  - **View offset:** the camera's target shows in the middle of the open area between the HUD
    bars.
- 2026-10-13 (phase 1): **terrace corners are smoothed.** No land tile is more than one level above
  any of its 8 neighbours. One hilltop corner tile (33,17) is level 1, so placing things needs flat
  ground (`canPlace` → 'uneven').
- 2026-10-13 (phase 1): **finger targets in the tap test.** Every tile must take a 44 px finger at
  ≥ 3 of 8 turns at the closest zoom. An inner terrace corner, raised on two sides, is open to
  exactly 3 turns. A tap on any tile's middle works at all 8 turns, and the test counts that every
  tile was framed.
- 2026-10-13 (phase 2): **the hand tool does most things.** It picks (tap or drag a row), clears
  clutter, opens Seeds on an empty field, and opens a care card on a growing crop. The other tools
  are for painting rows. A drag that starts where the tool can't act pans the view.
- 2026-10-13 (phase 2): **care points → stars.**
  - Points: watered, compost, rotation (a different family from last time), nitrogen (a legume
    before), and bees (flowering crops; phase 3).
  - 0 points → 1 star, 1–2 → 2 stars, 3 or more → 3 stars.
  - Nitrogen and bees each add +1 to the harvest.
  - Compost makes the crop grow 25% faster.
- 2026-10-13 (phase 2): **prices.** In season ×0.9, out of season ×1.15, and a daily wobble of
  ±6%. Each extra star pays at least one more coin. ↑ marks a price more than 2% above usual.
- 2026-10-13 (phase 2): **the safety net** gives 6 free plantings of the cheapest seeds. It kicks in
  when coins are below the cheapest seeds and nothing is growing or sellable.
- 2026-10-13 (phase 2): **the away bonus** is real time since the save, capped at 10 minutes of
  growing. It moves growth timers only; the clock and seasons don't move.
- 2026-10-13 (phases 3–6):
  - **Farm panels keep the clock running.** That covers seeds, barn, shop, homes, workshops, town and
    the field cards. Settings, the menu and story moments stop it.
  - **Animals never get worse.** Unfed animals take twice as long and give 1-star products; feeding
    and brushing each add a heart (up to 3 stars).
  - **Bees** help flowering crops and bee-loving trees within 5 tiles (a care point, +1 to pick),
    and honey's stars come from flowers near the hive.
  - **Trees** rest out of season (the timer waits) and are "established" after 3 pickings.
  - **Workshops** take ingredients best-stars-first, and a good's stars are the average.
  - **Orders** only ask for `obtainable` things. They never expire and can be swapped for free. The
    boat takes about 2 minutes of play for a trip, and 2 crates at a time once the Riverside is
    open.
  - **Neighbours** (from level 5) offer one fair swap a day each and fill half of a co-op order as
    time passes; a visit comes about every 1.5 days, with a gift. The first neighbour to reach 3
    hearts gives the Country Set.
  - **Undo** in build mode keeps up to 30 snapshots and is cleared when you leave build mode.
- 2026-10-13 (phase 2): **ghost clicks.** A tap that opens a panel is followed by the browser's own
  click at the same spot, which chose a seed by itself on phones (found by the touch e2e). Panels
  now ignore a click within 24 px of the opening tap for 0.5 s; keyboard and gamepad presses are
  never blocked.
- 2026-10-14 (visual pass + camera brief): **the camera starts close.**
  - **Zoom limits:** 32 to 240 px per tile; the old range was 12 to 72.
  - **Pitch:** 50° (was 55°), so building fronts and the skyline show.
  - **Starting view:** a new farm (saved `cam.zoom` 0 means "not set") is framed on the farmhouse
    and its fields (`game/framing.ts`, `frameView` in `render/camera.ts`), filling 86% of the open
    area. It never starts below 64 px per tile on phones (short side under 600 CSS px), or below
    80 px on tablets and computers. It tries the turns 0°, 90° and 270° in that order.
  - **Phones held sideways** (landscape, at most 500 px tall) use a side layout instead of shrinking
    the farm. The top row is compact (48 px), the tools move into a slim scrolling rail down the right,
    and the camera buttons sit in one row beside the rail.
    - Settings → "Tools on the left" puts the rail on the left (`settings.leftHanded`).
    - The farm keeps about 80% of the height, so every supported screen shows the farmhouse and all
      fields at the starting minimum, with the rail on either side.
    - `ui/layout.ts` (`isSideways`, `TOP_BAR_SIDEWAYS`, `RAIL`, `openArea(…, side)`) matches style.css.
      Tests: tests/unit/camera.test.ts, plus tests/e2e/camera.spec.ts for the rail and the left side.
  - **Start fields moved:** the six old fields moved beside the cottage (38–39, 37–39), so the
    farmhouse and its fields fit one view (`START_FIELDS`). Saves keep the camera they had.
  - **Zooming eases** in distance, together with the target, so the ground under the cursor stays put
    (`FarmView.zoomGoalAt`). Pinches follow the fingers exactly; the +/− buttons zoom at the middle.
  - **"Show me":** tapping the goal pill glides to the fields it talks about (`Play.hintTiles`).
    Picking a tool whose work is all off screen glides there too (`Play.toolTiles`). Both use
    `FarmView.glideTo`, which is a cut with reduced motion.
- 2026-10-14 (visual pass): **the look.**
  - **Renderer:** ACES tone mapping, like Space Sky. Low tone-maps in the renderer; Medium and High in
    the post chain (`render/post.ts`), with a colour grade by season and time of day.
  - **Post effects:** bloom on Medium and High; SSAO and the tilt-shift blur on High only.
  - **Shadows:** PCF shadows with a radius, because PCFSoftShadowMap is gone in r186. The shadow box
    follows the view in snapped steps.
  - **Ground:** a painted shader (`render/ground.ts`) driven by a data texture covering farm land,
    locked land, worn ground and contact shade.
  - **The world:** a ring of countryside 26 tiles wide (`render/land.ts`), with round banks from a
    signed-distance field and a sky dome with haze.
  - **Surface patterns:** planks, shingles, stone, straw, bark and moss are drawn by the shader from
    a per-part id (`geo.ts PAT`, `fx.ts PATTERN_GLSL`). There are no textures to load.
  - **Ambient occlusion:** baked into vertex colours by `merge` on every tier; High adds SSAO on top.
  - **Life:** farmhands (`render/helpers.ts`, picture only, never change the farm), grass, butterflies,
    birds, smoke and sparkles. Butterflies, birds and leaves are hidden with reduced motion.
- 2026-10-14 (owner): **Low's budget is what is drawn, not the scene total.**
  - **Budget:** about 150k triangles drawn at the starting zoom, and draw calls in Space Sky's Low range
    (≤ 66).
  - **What gets cut:** far-away detail and density go first. The farm, the crops and the characters
    look the same on every tier.
  - **How:**
    - Scenery and farm things cull single instances to the view (`InstancedLayer` with `cull`, and
      `Culler`). They re-cull only when the camera has moved past a margin.
    - The ground is 4 × 4 chunks culled by their boxes (`cullTerrain`).
    - Tree looks and wildflower colours are per-instance tints (`fx.ts` `tint`), not extra layers.
    - Low thins the countryside beyond the farm's edge: cheap trees from 3 tiles out, fewer bushes,
      reeds and props.
  - **Measuring:** `npx tsx scripts/drawn.mts` counts draws on the CPU without WebGL.
    `scripts/shots.mjs` measures in the browser, at the start and at zoom 32, with steady frames and
    shadow-redraw frames.
  - **Style frame, measured in the browser** (2026-10-14, M3 Pro, `scripts/shots.mjs`, steady frames;
    frames that redraw the shadow map add about 30% on Medium and High). Every case ran at 60 fps.

    | Tier | Phone, start | Phone, zoom 32 | Desktop, start | Desktop, zoom 32 |
    |---|---|---|---|---|
    | Low | 51 / 68k | 62 / 110k | 54 / 68k | 70 / 176k |
    | Medium | 62 / 109k | 75 / 167k | 66 / 109k | 85 / 333k |
    | High | 108 / 238k | 136 / 493k | 116 / 219k | 153 / 893k |

    Each cell is draw calls / triangles. High draws the scene twice, once for SSAO's normal pass;
    grass, water, particles and the far woods are on the NO_AO layer and skip that pass.
  - **Low over budget:** only fully zoomed out on a desktop. The farm's own variety, 34 kinds of
    things in the staged corner, is most of it, and the farm looks the same on every tier.
  - **Before** (old renderer, same corner): Low 41 / 100k, Medium 72 / 175k, High 72 / 178k on the
    phone.

- 2026-10-14, phase 7:
  - **Story moments vs tips.** Chapter dialogue and rewards are modal cards that stop the clock. Tips
    are a small `aside.tip-card` that doesn't block the farm and hides itself after 22 s. Stall hints
    are toasts ("A little hint: …") after 150 s with nothing moving forward, then every 240 s.
  - **One action dispatcher.** `sim/actions.ts` `act(farm, action)` is what the UI, the farmhands,
    the bot and the tests all call.
  - **Unreadable saves** are copied to `fieldlark.save.broken` before anything else happens. If that
    copy can't be made, the game treats the save like one from the future: it never overwrites it.
  - **Full storage:** a refused write keeps the last good save as it was. The player gets one
    friendly "Out of room to save" card (the clock keeps going), then a toast once saving works
    again.
  - **Number keys go by the tool's label,** not its position, so 7 is Shop, 8 Animals and 9 Town on
    every screen. **T** (or gamepad **X**) moves focus to the tool bar: arrows move, Enter picks,
    Escape goes back to the farm.
  - **Reading level:** `core/readability.ts` (from Light Crossing). Every story line, goal, hint,
    request and tip is grade 7 or below, and each group averages 4.5 or below. Lines of five words or
    fewer skip the per-line check, where the formula misfires.

## The owner's "go" (2026-10-14) for docs/PLAN-2.md
- **Name:** **Fieldlark** (slug `fieldlark`, storage prefix `fieldlark.`).
- **Plan:** approved as written, with these notes:
  1. Merge `main` first, before any building.
  2. Fix the audit's bugs early in phase 7: keys 7–9, the gamepad X / T key, and a full storage
     silently stopping saves. A full storage must show a friendly message and never lose or corrupt
     a save.
  3. Don't fight Shooberry for list position 9: the first PR to merge takes 9, the other takes the
     next number. Adjust at merge time.
  4. MCP catalog: approved to bump the catalog app's version when Fieldlark is added (full-screen).
     It goes live only with the owner's production approval.
  5. Trailer: 15 seconds of real Fieldlark gameplay in the approved look, like the other games.
- **Then:** work autonomously through phases 7–15 to the PR and preview link, and stop before
  production.
- **Decision (mine):** the rename to `fieldlark` happens right after the merge, not in phase 15. The
  name is final, so every new file, the new save format and the tests use it from the start.

## Names (phase 0: five proposals, web-checked; the owner picked Fieldlark on 2026-10-14)
**How they were checked (2026-10-13).** Web searches limited to each store's domain: the App Store
(apps.apple.com), Google Play, Steam and itch.io. Then general web searches for any game, app, toy,
board game, brand or trademark with the same name. My own spot-check searches repeated each
finalist's search. These are search-index checks, not registry searches: run the owner's pick through
USPTO, EUIPO and UKIPO before launch.

**Proposals.** None turned up a game, app, toy or brand with the same name:
1. **Fieldlark.** "Field lark" is an old folk name for the skylark, and "a lark" is a bit of fun. It
   fits the town of Larkford and the boat, the Little Lark. Nothing on the App Store, Google Play,
   Steam or itch.io. The nearest itch.io project is "Fenlark", a different name.
2. **Brightacre.** "Bring the sleepy farm back to bright life." Nothing in any store and no
   brand. The nearest names are "Brightwood Adventures" and "BrightFarms" (produce), both
   different.
3. **Hayloft Hill.** Cozy, alliterative and easy to read. Nothing in any store; only holiday
   cottages called "The Hayloft". "Hay" faintly echoes a big farm game's title.
4. **Sprout & Sail.** Names both halves of the game, growing and boat deliveries. Nothing in any
   store. Several unrelated games are called just "Sprout", and there is a farming game "Sprout
   Valley".
5. **Commonfield.** Says "community farm" directly; the common field was a historical shared
   farming field. Nothing in any store. It may sound a little dry for kids.

**Spares:** Acre & Oar, Furrow & Ferry, Croplet, Sunnyrow.

**Checked and dropped:**
- **Furrowfield:** it is the farming island in a big publisher's building game, with the same
  restore-a-farm premise, and it echoes a farming board game's setting.
- **Plotwise:** an iOS math puzzle game.
- **Tillbrook:** sounds the same as "Tilbrook", a browser game about building a rural valley.
- **Greenrow:** a large home-furnishings brand.
- **Rowhaven:** crowded "-haven" farm-game names.
- **Sowtown:** the "-town" ending echoes farm-game titles, and "sow" can be an insult.
- **Patchwork Acres:** a well-known board game is called "Patchwork".

**Place and cast names checked the same way:**
- **Larkford** (the town) is fine: it is only the village in an adult novel series.
- **Plumridge Orchard** and **Nannyberry Farm** are clear.
- Neighbor "Reedbank" → **Reedmere**: as two words, "Reed Bank" is a disputed sea area.
- The boat "the Lark" → **the Little Lark**: "Lark" is a cigarette brand.

## IP log (names or designs changed after a check)
Other companies' games are described here, not named (this is a public repo).
- The owner's project name "FarmerTown Ville" ends in "-Ville", like the inspiration's title. It is
  never used in the game or its listing. The working name is "Farm WIP".
- Title candidates dropped after the 2026-10-13 checks (details in "Names"):
  - Furrowfield: a big publisher's farm island;
  - Plotwise: an iOS puzzle game;
  - Tillbrook: a sound-alike rural building game;
  - Greenrow: a furnishings brand;
  - Rowhaven and Sowtown: they echo farm-game titles;
  - Patchwork Acres: a famous board game.
- Neighbor farm "Reedbank" → **Reedmere**: "Reed Bank" is a disputed sea area.
- 2026-10-14, visual quality pass: the owner shared two screenshots of the inspiration's sequel as a
  **quality reference only**: how rich, dense, lively and close the view should feel. Nothing was
  copied, traced or sampled from them: no characters, buildings, crops, props, textures, colours,
  UI, icons or layout. Every model, pattern and colour is our own and made in code. Comparison
  images that include the reference stay local (git-ignored `reports/`) and are never committed.
  Our own takes on the qualities: volunteer farmhands from Larkford (not a player avatar), a
  butter-yellow clapboard cottage with a terracotta shingle roof, a sky-blue hen house on legs.
- Boat "the Lark" → **the Little Lark**: "Lark" is a cigarette brand.
- Cast check (2026-10-13): there were no real clashes for Hattie, Tomasz, Amara, Silas, Wendell, Mrs.
  Penrose, Ingrid, Femi, Mr. Lu, Larkford, Plumridge Orchard, Nannyberry Farm or Reedmere; only
  name-only overlaps with different roles. Renamed to stay well clear:
  - farm dog "Barley" → **Rufus**: a classic farm series has a rancher called Barley;
  - sheep "Lambkin" → **Dumpling**: a children's TV fire-station show has a lamb called Lambykins;
  - duck "Waddle" → **Dabble**: a cartoon has a duck called Waddle.
- 2026-10-14, new cast for PLAN-2 (web and store searches, plus each big farm game and kids' TV
  franchise; no trademark registers):
  - farmhand names **Pip** and **Rafi** dropped: Pip is a barn mouse in a farm cartoon and a rabbit in
    a preschool show; Rafi is a 2026 preschool show's wizard, and a 2023 show has a farm dog "Raffi".
    **Fen** replaces Pip. The six farmhands are Fen, Juno, Wren, Bea, Kit and Moss, all clear (Moss is
    only an item in one farm game and the title of a VR game whose hero has another name);
  - café owner **Rosa** is clear with one caveat: a classic fire-station show has a café cat called
    Rosa. So the café is **The Lark's Nest**, never "Rosa's Café";
  - **Mr. Hollis** and his fabric shop **Bobbin & Thread** are clear.

## Progress
Plan 1 (`docs/PLAN.md`) phases 0–6 and the visual pass are done. The rest follows `docs/PLAN-2.md`.

| Phase | Status |
|---|---|
| 0–6 Setup, engine, fields, orchards and animals, production, build mode, town | done (118 unit tests; 44 e2e) |
| Visual pass (style frame, close camera, sideways phones, Low budget) | done, approved by the owner |
| Merge main + rename to Fieldlark | done |
| 7 Story, onboarding and the audit's bugs | done (185 unit tests; e2e smoke + story 46/0) |
| 8 Books, ledger and the farmhouse hub | done in code (195 unit tests); browser check pending a quiet machine |
| 9 Soil, weather, breeding, fair categories | done in code (221 unit tests); browser check pending a quiet machine |
| 10 Farmhands as workers | done in code (232 unit tests); browser check pending a quiet machine |
| 11 Larkford town square: the farm stand and contracts | done in code (247 unit tests); browser check pending a quiet machine |
| 12 Channels, sprinklers, greenhouses, the Farm Lab | done in code (264 unit tests); browser check pending a quiet machine |
| 13 The look everywhere, seasons, night, music | — |
| 14 Save v2, bot and pacing, performance, full QA | — |
| 15 Site step, trailer, MCP catalog, PR and preview | — |

**Phases 1–2 notes:**
- Build 638 KB.
- The farm draws in about 20 draw calls on High.
- `src/data/orchard.ts` is written ahead for phase 3.
- Not done yet (later phases): rain and snow effects, crop sway, a model for the compost bin's
  bags, the cottage and dock doing anything (story and orders), and the Crop Book showing the facts.

**Phases 3–6 notes:**
- Build 731 KB.
- The showcase draws with every system on screen.
- The story data (`data/chapters.ts`) and the seasonal fair (`sim/fair.ts`) are written ahead for
  phase 7 and are not wired in yet.
- Polish noted for phase 9:
  - made goods need their own icon shapes (flour looks blank on a white card);
  - the bare-bush snow is a box.

**Phase 7 notes:**
- `game/storyFlow.ts` runs the story on screen; `data/chapters.ts` is the final eight-chapter arc
  (it already names later mechanics: helpers, contracts, channels, the greenhouse, the Lab).
  Goals for systems that don't exist yet can't be met until their phase lands.
- The credits name the new cast and the six farmhands.

**Phase 8 notes:**
- The farmhouse (tap the cottage, or Menu → Farmhouse) is the hub: Farm Book, Ledger, Goals, Ribbon
  wall. Phases 10–12 add Farmhands and the Lab there.
- Crop prices were rebalanced so later crops pay more a minute (`tests/unit/ledger.test.ts` holds the
  trend). The stand's lessons page lands with the stand in phase 11.

**Phase 9 notes:**
- Soil (`sim/soil.ts`): new and old fields start at nitrogen 1, humus 1 (old saves: a legume's old
  `legumeLeft` becomes nitrogen 2). The care points are fixed at planting (`boost`, `humus`).
- Forecast (`sim/forecast.ts`): one seeded event a day; rain keeps `weather.ts`'s days, snow keeps its
  noise. Effects run in `tick.ts` (`new-day` event). Mushrooms are debris `mushrooms` that give the
  `mushroom` item; they don't count as clearing clutter or lower beauty.
- Varieties (`data/varieties.ts`): their harvest is its own item (`<crop>-<key>`, `base` = the crop),
  used for selling, the stand and the fair only; workshops and orders use the ordinary crop. A missed
  cross makes the next 10% likelier (`flags.crossTries`).
- Fair: classes produce / made / variety / pretty; ribbons in `farm.ribbons` (newest 48) and
  `farm.ribbonCount`; the first ribbon unlocks the Ribbon Wall decoration (`set:ribbons`).
- Ideas (`farm.ideas`) are earned now (ribbons, varieties); the Lab spends them in phase 12.
- Not yet drawn (phase 13): weather effects for wind, mist and fireflies.

**Phase 10 notes:**
- `sim/helpers.ts`: each helper has a job, a task (an `Action` for `act`) and `nextAt`; the task is done
  when the clock reaches it. The UI and story say "helpers" (the goals did already); code comments say
  farmhands too.
- **Decision:** a watering or harvesting patch is a whole open area (or everywhere), chosen from a
  list, instead of a rectangle dragged on the map. It works the same with touch, mouse, keyboard and
  gamepad, and kids can read it.
- Deliveries send board orders only (not story requests). Contract drops and stand restocking join
  in phase 11.
- The 3D figures: hands 0–5 are Fen…Moss (`HELPER_LOOK` in `data/cast.ts`). A hired helper's figure
  follows their sim task; volunteers without a job keep pottering and reacting to the player.

**Phase 11 notes:**
- Larkford's square (`render/square.ts`, `models/square.ts`) is drawn south of the farm at
  `SQUARE` (`sim/map.ts`, world units, not farm tiles). The camera may pan down to it
  (`VIEW_Z_MAX`); the land there is flat and scenery and grass keep off it. The boat now sails to
  its jetty and back.
- Stand (`sim/stand.ts`): a fair stand price is the market price × 1.4 (`STAND_MARKUP`); the slider
  goes 0.6–1.6 of that. A sold-out shelf remembers its item so helpers on Deliveries can top it up to
  its "keep" level. Sales count towards `sold` and `stand-sold`.
- Contracts (`sim/contracts.ts`, `data/businesses.ts`): drops ride the boat as crates tagged
  `contract`; they don't count as board `orders`. `contract:<id>` counts delivered drops.
- The content test forbids the word "premium" anywhere in `src`, even in code names.

**Phase 12 notes:**
- Channels are code 4 in `farm.paths` (`sim/water.ts`). `wetMap` is cached on the paths string (and
  the culverts idea). Fields are watered by water at dawn (`new-day`) and at planting. Sprinklers are
  decor `sprinkler` (chapter 5), placed beside a channel (decor can't sit on a path tile).
- Greenhouses are buildings with `plots`; beds live in `data.plots` (`sim/greenhouse.ts`). Beds are
  every footprint tile except the 3×3's front middle (`bedTiles`). Glass is a separate see-through
  instanced layer (`glass:<def>`, `Materials.glassInst`).
- The Lab (`data/lab.ts`, `sim/lab.ts`) sets `lab:<id>` flags; the effects are read where they act
  (production slots/speed, compost, barn cost, helper pace and skills, stand shelves, sprinkler reach,
  culverts, wide channels, greenhouse sizes, warm glass, sunny benches, flower beauty, decor sets).
- **Bug fixed:** level-ups were only noticed for XP gained inside the clock tick, so harvest XP never
  showed the level-up card. The tick now compares with `flags.levelSeen` (old saves start at their
  level, and get the Lab ideas their levels would have earned).

**Next:** phase 13 (the look everywhere, music) needs the GPU; while the machine is busy, phase 14's
CPU work (save v2, the bot and the pacing sim) can go first.
