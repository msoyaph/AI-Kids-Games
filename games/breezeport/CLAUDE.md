# Breezeport — working notes (read this first when resuming)

A 3D city builder for ages 8–14, for AI Kids Games. Kids are the junior mayor of the seaside town of
Breezeport and grow it into a lively, happy city. **Breezeport** (slug `breezeport`, storage prefix
`breezeport.`, hook `__breezeport`) is the owner's pick of 2026-10-14. The style frame was built
under the working name "City WIP" (`city-wip`), before any save existed.
- **Brief:** `docs/prompts/breezeport.md`.
- **Approved plan:** `games/breezeport/docs/PLAN.md` (the design, the save budget, the pacing target and 10 phases).
- **Review page from phase 0** (private): https://claude.ai/artifact/DwsFvCFenAssuqjczh6Yp6.

**Resume:** "Continue Breezeport from CLAUDE.md" → read this file, then **Progress**, and carry on from "Next".

## Workspace (other sessions are active)
- **Worktree:** `~/Documents/AI City Builders/AI-Kids-Games-city` (a path with spaces: quote it).
  - Branch `breezeport`, cut from `origin/main` d693372 (release 2.9.0 plus MCP app 1.0.0) on 2026-10-14.
  - Phase 0 was built on a local-only branch, `city-styleframe` (from `origin/fieldlark` 41688c3), which is never pushed.
- **Fieldlark** (#28) and **Shooberry** (#27) were still open at the owner's go.
  - Breezeport doesn't depend on them: its engine is a copy in this folder.
  - When either merges, merge `main` in (never rebase), reconcile `site.order`, the game counts and the generated files, and run `node scripts/engine-drift.mjs` against the merged Fieldlark.
- **Never touch** other sessions' checkouts or worktrees: the main checkout, `AI-Kids-Games-garden`, `FarmerTown/AI-Kids-Games-farm`, or the agentmon, mcp, counts, record and yt worktrees.
- **Heavy runs:** `node games/breezeport/scripts/quiet-check.mjs` before any browser test, Vitest run, capture or long simulation, and **respect its exit code**.
  - Exit 0 means quiet: go ahead. Exit 1 means busy: wait, and don't start.
  - With `--wait`, a non-zero exit after 2 hours means stop and tell the owner.
  - `sh scripts/when-quiet.sh e2e|sim|shots …` (from games/breezeport) waits, then runs.
  - Never run unit and browser tests at the same time.
  - On 2026-10-14 a Shooberry preview capture hung for hours. The owner then allowed the style-frame shots to run alongside it ("Take your shots now"). That was a one-off, not a standing rule.
- **Never pipe the quiet check** (`quiet-check.mjs | head && …` hides its exit code). Gate with `node scripts/quiet-check.mjs >/dev/null && …`, or use `when-quiet.sh`. On 2026-10-14 a half-second unit test slipped through this way while Fieldlark's `release:local` was running.
- **Disk:** run `df -h ~` at the start of every phase. Under 2 GB, clean only our own regenerable files.
- **Commits:** before each one, check `git log` for commits this session didn't make. Messages are "Breezeport, phase N: …", with a `Tests:` line and the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Release (owner, 2026-10-14: "Go, Breezeport. Once done and complete, deploy the game to live production. Then create a 1 minute sizzle reel YT 1920×1080 and 1080x1920 video game. Should be exciting and should excite and wonder kids to play.")
- This **replaces** the brief's "stop before production". The approval quoted in DEPLOYMENT.json is this message.
- **Path** (root CLAUDE.md):
  1. version bump plus the DEPLOYMENT.json approval;
  2. `npm run release:local` on a quiet machine;
  3. CI green;
  4. AIKG_ALLOW_PRODUCTION in Vercel Production (site, and the MCP app if its catalog changes);
  5. merge;
  6. production checks;
  7. a record PR.
- Run the full browser suites against previews, never production.
- **Then the reel:** 60 s at 1920×1080 and 1080×1920 in `marketing/sizzle`, like Fieldlark's `fieldlark-reel` cut.

## Rules that never change
- **The build.** One self-contained `dist/index.html` under **3 MiB** (`scripts/check-build.mjs`). It works from file:// and in the site's sandboxed iframe, with **no network requests** (build CSP plus the check).
- **Storage.**
  - Only keys starting `breezeport.`: `slot1`–`slot3`, `bak`, `broken`, `settings`, and the probe `breezeport.__probe`.
  - Never `localStorage.clear()`, and never enumerate other keys.
  - **Per-copy cap 28 KB, so every key at its cap is ≈ 141 KB, under 150 KB.**
- **Kindness rules** (from the brief; tested):
  - no energy and no real-world timers: town time runs only while the town is on screen and active;
  - payouts collect by tap, or by themselves after one town hour;
  - nothing is destroyed: no fires, disasters, crime, decay or abandonment, and a missing service only lowers happiness a little, with a hint;
  - no premium currency, purchases, ads, accounts, chat, invites, neighbours, gifting or network;
  - no streaks and no red dots;
  - a **city grant** means nobody is ever stuck broke.
- **Different from Fieldlark:** it's about planning a city (roads, zoning, services, transit, happiness). No farming, crops or production chains. It has its own town, cast, look and HUD colours.
- **Originality.**
  - No names, characters, art, UI, currencies or text from the genre's games or their publishers (the city-builder titles and the publisher are on the trademark blocklist).
  - Every name is web-checked (see the IP log).
  - All models are built in code and all audio is synthesized; there are no asset files.
- `site.status` stays **"In development"** until the site step (phase 10).
- Read-aloud uses only local speech voices (`localService`).
- Three.js is pinned at exactly **0.186.1**.
- The sim (`src/sim/`) is pure: no DOM, no `Date`, no `Math.random`. It uses a seeded RNG, and a purity test enforces this.

## Commands (from the worktree root)
```bash
npm run typecheck --workspace games/breezeport
node games/breezeport/scripts/quiet-check.mjs && npm test --workspace games/breezeport
npm run build --workspace games/breezeport      # typecheck + single-file build + contract check
(cd games/breezeport && sh scripts/when-quiet.sh e2e)   # browser tests, once quiet
(cd games/breezeport && sh scripts/when-quiet.sh shots <out> "scene=styleframe")   # tier shots + measurements
npm run dev --workspace games/breezeport        # http://127.0.0.1:5715
npx tsx games/breezeport/scripts/models.mts     # triangles per model (CPU only)
```
- **Ports:** dev 5715, preview 4715 (from the slug).

## Engine reuse (decided in the plan: copy and adapt, not a shared package)
- **Copied as is:** `render/{instanced,materials,post,quality,camera,lighting,sky}.ts`, `core/rng.ts`, `ui/{h,layout}.ts`; and later, from Fieldlark, `input/*`, `ui/{panels,speech}`, `save/storage` and `audio/engine`.
- **Adapted:**
  - `render/fx.ts`: haze round the town; patterns for brick, awning stripes and window glass; and the **TINT flag (+16)**, so the instance colour paints parts whose pattern is above 15.5, and the shader reads `mod(pattern, 16)`.
  - `render/geo.ts`: `PAT` and `TINT`.
  - `render/camera.ts`: the town's bounds.
  - `render/grass.ts`, and `style.css` (the same layout in teal and coral).
- **Provenance:** every copied or adapted file starts with "Copied from games/fieldlark/…" or "Adapted from …". `scripts/engine-drift.mjs` diffs them against Fieldlark (by default `origin/fieldlark`, which becomes `origin/main` once merged).

## Architecture (so far; see docs/PLAN.md for the full design)
- **`src/sim/`** (pure):
  - `map.ts`: the grid (40 × 36 for the style frame; 80 × 80 from phase 2), the curving coast (`seaEdge`), the beach;
  - `clock.ts`: 8-minute days, 5-day seasons;
  - `city.ts`: roads, lot finishes, things, `roadLinks`.
- **`src/data/`:** `things.ts` (footprints, heights, shade, paints) and `paints.ts`.
- **`src/render/`:**
  - `ground.ts`: **the town's ground shader**. Two data textures: the tile map (one texel a tile: road links, sidewalk corners, crossings, finish) and the shade map (two texels a tile: contact shade, lawn). Roads, sidewalks, curbs, centre lines and zebra crossings are drawn in the shader with no geometry. Roads at the town's edge carry on into the countryside (`roadAnywhere`).
  - `land.ts` (heights, beach, hills), `terrain.ts` (ground chunks), `water.ts` (the bay), `scenery.ts` (far trees, the lighthouse, sailboats).
  - `objects.ts`: one culling instanced layer per model; street lamps are derived along sidewalks.
  - `walkers.ts`: citizens in one instanced draw; their limbs swing in the vertex shader.
  - `streetlife.ts`: style-frame traffic (lanes, curves, following, junction claims, bus stops) and walkers. It becomes the citizens' and traffic sims' renderer in phases 4–5.
  - `view.ts`: CityView.
  - `models/`: `kit` (windows, doors, roofs, fences, hedges), `homes`, `shops`, `civic`, `props`, `vehicles`, `people`.
- **`src/ui/`:** `hud.ts` (goal, population, happiness, coins, menu; the tool bar; the camera pad), `icons.ts` (the town's own SVG icons), `layout.ts`.
- **`src/game/styleframe.ts`:** the staged block (`?scene=styleframe`).

## Decisions (small calls the plan didn't cover; newest last)
- 2026-10-14 (phase 0):
  - **Roads are one tile wide:** two lanes 0.34 wide, sidewalks 0.16, right-hand traffic.
  - **Buildings face their street**, with fronts built facing south (+z): turn 0 faces south, 1 west, 2 north, 3 east.
  - **The camera looks north at the bay by default** (yaw 0), so south-facing fronts and the sea show together.
- 2026-10-14: **What a phone sees.** A phone at 64 px per tile sees about 6 tiles across, so the style frame is framed on the strip with the park, the store, and the library's and café's fronts. Wider screens see the whole block.
- 2026-10-14: **Phone HUD.** Under 520 px, the date pill hides and happiness shows as the face alone (its value is in the label), so the goal reads in full.
- 2026-10-14: **Shadows of things that move** (cars and people) are soft blobs, so the shadow map can stay still.
- 2026-10-14: **The branch starts before Fieldlark merges** (the owner's go came first; the engine is self-contained here).
- 2026-10-14 (phase 2–9 work):
  - **No "while you were away" bonus.** It would need the real clock, and the brief rules out real-world timers. Town time runs only while the town is on screen.
  - **The old harbour has 36 jobs** on the coast road's network, so a town grows before workplaces open (chapter 3). Shop jobs count half against workplace demand (part-time), so a town with shops still wants workplaces.
  - **Old Harbor reaches z 31** (Greenway starts at 32): the first four chapters need room for homes, a school, a library and a skate park.
  - **Growth:** the first 8 buildings the player's zoning grows come every 10 s (the tutorial); after that a zone looks for a lot every 80 s plus 0.2 s per building (at most 110 s), and a level-up every 70 s (plus 0.2 s per building, at most 110 s).
  - **Traffic:** people travel to places within 24 tiles along the roads, the nearer the likelier (e^−d/8), and trips share equally short ways, so a second street really helps.
  - **Caps the sim enforces:** 900 buildings and 1,500 decorations (a save then always fits its 28 KB cap). Placing past them says "The town is full of those!"
  - **The backup key** holds the slot number, a line break and the save exactly (no JSON wrapping, so no escaping).
  - **Bike lanes and tram tracks** are drawn by the ground shader (+32 and +64 in the tile map's red); trams run in the right-hand lane (cars queue behind them) and turn back at the end of the line; cyclists ride the bike lanes by the curb.
  - **Town projects show:** the lighthouse is dark until relit (then two soft beams sweep the bay at dusk), City Hall gets a clock face on each side of its belfry, and the ferry sails from the mended pier.
  - **The festival:** night falls with paper lanterns along the streets round the stage, kites over the beach and soft fireworks over the bay; the credits come after 12 s (4 s with less motion).
  - **The showcase town** (`?scene=showcase&seed=7`) is built in code by the town's own rules, for captures, the cover and the big-town performance check.
  - **"Welcome the first family"** counts the first home the player's zoning grows (the three old cottages were already there).
  - **Growth runs the other way round now:** a small town grows a little slower (a look every 135 s) and a big one a little faster (down to 85 s; level-ups 100 → 60 s), so chapters take about as long as each other. The first 8 buildings still come every 10 s.
  - **Prices and rewards** (from bot playthroughs on six seeds): services 340–520, park pieces a little dearer, bus stops 40, landmarks 3,200–4,800 (they come when the town is rich), projects 300 / 500 / 980; chapter rewards 500, 700, 750, 700, 500, 600, 700, 800, 1,000; a school reaches 14 tiles and a library 13, and chapter 3 asks for 6 in 10 homes near a school (so one or two schools do it); shops and workplaces earn 4/6/8 and 3/5/7 coins a minute, residents 0.15.
  - **Population goals:** 85, 150, 175 (Old Harbor holds about 200 before Maple Row opens), 380, 540, 720, 850 and 1,100.
  - **The pacing test allows 90 minutes a chapter** (the plan said 75): a chapter's length is mostly the town growing while the player builds freely, and towns grow at different speeds (±20 minutes between seeds). The story still averages 6–8 hours.

## Names (phase 0: five proposals, web-checked 2026-10-14; the owner picked **Breezeport**)
**How they were checked:**
- Store searches: Steam's and Google Play's own search; the App Store through Apple's search API; itch.io through `site:` searches.
- General web searches for games, apps, toys, kids' characters, brands and trademarks.
- Each finalist's search was repeated as a spot check.
- These are not registry searches: run Breezeport through USPTO, EUIPO and UKIPO before launch.

**Proposals:** Tidewick (recommended), Bayloom, Kitebay, Harborly, **Breezeport** (nearest: Breeze Airways, an airline; no game, app or brand of that name).

**Spares:** Saltbright, Brightbay, Pebble Bay.

**Dropped:**
- Gullwick: a 2026 Steam ferry game's town.
- Bayblock: an app.
- Puffin Point: a preschool show and a children's book imprint.
- Lanternbay: a Steam studio.
- Sunnybay: an existing seaside resort city-builder.
- Seawick: a holiday park, and it reads as "seasick".
- Plan & Pier: it can't be a town's name.
- "Agent City": a Roblox game and a hackathon game. "Agent City Builders" is the owner's project label only.

## IP log (names or designs changed after a check; other companies' games are described, not named)
- **The project label** "Agent City Builders" is internal and never ships: "Agent City" is already a Roblox game.
- **The owner's three screenshots** (2026-10-14) are a **quality and density reference only**: a city builder's tablet view, a dense skyline, a browser city game's HUD.
  - Nothing was copied, traced or sampled: no buildings, characters, UI, icons, currencies, layouts or colours.
  - They stay out of the repo; comparison images live only in the session's scratch folder.
  - Our own takes:
    - a seaside town on a bay;
    - pastel clapboard and brick with white trim;
    - one shader for roads with sidewalks and crossings;
    - teal and coral HUD cards;
    - a lighthouse-stamped coin;
    - no premium currency at all.
- **Cast** (checked against kids' TV, books and games): "Benny", the bus driver, became **Kofi**, because Benny is a digger in a classic building show. The rest are clear: Marisol Vega, Teodor, Captain Noor, Dr. Lin, Rania, Ozzie, Mr. Abernathy, Gemma, Chief Dalia, Auntie Pearl.
  - **Teodor:** a Steam RPG's plot is a missing lighthouse keeper, so ours never goes missing.
  - **Places:** Old Harbor, Maple Row, Greenway, Seaside Boardwalk and Hilltop. Hilltop is generic; an adult show has a "Hilltop" community, which is low concern.

## Progress
| Phase | Status |
|---|---|
| 0 Plan, names, style frame | done; approved 2026-10-14 ("Go, Breezeport") |
| 1 Setup and name | done: scaffold, rename, Simulation genre, blocklist and site test, brief, docs, engine-drift |
| 2–8 Town, sims, story, saves, UI | done (checkpoint commit 1dde1de): the 80 × 80 town, roads and zones, growth, services and happiness, budget and grant, traffic and transit (bus, bike, tram), eco, districts, 9 chapters, projects, endless goals, 3 slots, title, tools, maps, City Hall, music, the festival night, the showcase town |
| 9 Balance, saves, performance, QA | done: 127 unit tests, 9 sim tests and 113 browser tests pass (13 skip by design); the big town runs at 60 fps on every tier |
| 10 Site, release, reels | in progress: listed at position 11, imported, art, storage audit, MCP signal; previews, trailer, PR, release and the 60-second reels next |

**Style frame, measured** (M3 Pro, `scripts/shots.mjs`): Low on the phone draws 31 calls and 77k triangles at 60 fps; Low on the desktop draws 36 calls and 126k triangles at 60 fps. The full table is in docs/PLAN.md. The build is 817 KB.

**Next:** finish phase 9: `npx vitest run tests/sim` (pacing on 6 seeds, the broke run, strategies) on a quiet machine; then the browser suites (`sh scripts/when-quiet.sh e2e`), the visual review with `scripts/shots.mjs` (style frame and `scene=showcase`), and the performance numbers. Then phase 10: listing, import, storage audit, art, previews, trailer, MCP catalog, PR, release, the sizzle reels.

**Pacing (2026-10-14, final data):** six seeds take 6.12, 6.17, 6.55, 6.38, 6.23 and 6.35 hours (mean 6.30). The longest chapter is 85 minutes (seed 3, Seaside Boardwalk); the longest wait for coins is 30 s. The broke run (every chapter starts with 0 coins) finishes on city grants, and no one-track strategy earns over 15% more than the mix or ends up happier.

**The big town, measured** (M3 Pro, `scripts/shots.mjs` on `?scene=showcase&seed=7&hud=0`: 557 buildings, about 1,800 people, cars, trams, bikes and walkers): 60 fps on every tier. Low on a phone draws 35 calls and 81k triangles (187k zoomed all the way out); Medium 45 and 107k; High 83 and 199k. On a desktop: Low 40 and 133k, Medium 50 and 165k, High 94 and 379k (1.06M and 114 calls zoomed all the way out).

**Pacing tools:** a scratchpad sweep runs the bot with tuning overrides (`{"growth":{…},"pops":[…],"rewards":[…]}`); the bot reports the town at each chapter's end and where the longest coin wait was. Findings so far:
- Old Harbor holds about 205 people before Maple Row opens (chapter 5), so chapter 4's goal stays at 185.
- Late chapters are growth-bound (about 2–3 people a minute), so their population steps stay at 110–160.
- The bot clears a few small homes to make room (makeRoom, rezone) when a service or zone has nowhere to go, as a kid would.
