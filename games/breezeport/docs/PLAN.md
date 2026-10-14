<!-- The phase 0 plan, approved by the owner on 2026-10-14 ("Go, Breezeport"), kept as written apart from
the name. Later decisions are logged in ../CLAUDE.md. The owner then changed the release rule: "once done
and complete, deploy the game to live production", followed by a 60-second sizzle reel. -->

# Plan: Breezeport, a 3D city builder for AI Kids Games (working title was "City WIP")

## Context

The owner wants a polished 3D city builder for ages 8–14, inspired by the city-building genre and fully original. Kids are the junior mayor of a small seaside town and grow it into a lively, happy city: roads, zoning, homes, shops, workplaces, parks, public services, transit and citizen happiness. It has 6–8 hours of goals and story, then an open-ended town and a Creative mode, on phone, tablet and computer.

**Precondition: Fieldlark had not merged yet** (and still hadn't at the owner's go).
- On 2026-10-14, Fieldlark is still open as msoyaph/AI-Kids-Games#28 (release 2.11.0), queued behind Shooberry (#27, 2.10.0).
- This plan and the style frame are built against the `fieldlark` branch tip, `41688c3`, in a local throwaway worktree. Nothing is pushed.
- Building starts only after the owner's "go" **and** Fieldlark's merge. The game branch is then cut from the latest `origin/main`, and the engine files are re-copied from the merged Fieldlark, so any review fixes come along.

**Repo rules followed throughout:**
- Own worktree and branch; never touch another session's checkout.
- `quiet-check.mjs` gates every Vitest, Playwright, capture or long simulation, and its exit code is respected.
- Full browser suites run against previews, never production.
- No foreign commits slip in, and history is never rewritten.
- Stop before production.

## Engine reuse: copy and adapt (not a shared package)

**Recommendation: copy Fieldlark's rendering stack into `games/<slug>/` and adapt it, with provenance on every file.** Extracting a shared package is the wrong move right now:

1. **Build integrity.**
   - `import-game` and `check-builds` hash each game's own inputs (`games/<slug>/index.html`, `package.json`, `src/`, `vite.config.*` and so on).
   - With a shared package, a change there would alter Fieldlark's shipped build without changing its recorded inputs, so CI would not notice the drift.
   - CI's `what-changed` picks suites by game folder, so it would also need to learn to run both games' suites when the package changes.
2. **Release safety.**
   - Extracting means refactoring Fieldlark right after its approval: re-import it, re-verify it, give it a new version and a new release, all tangled up with this PR.
   - Copying leaves Fieldlark's verified build byte-for-byte untouched.
3. **Fit.**
   - About two thirds of Fieldlark's render files are generic. The rest are farm-shaped: the ground's data channels, terraces, the river's distance field, the haze bounds around Larkford, the farm's pattern ids.
   - The city needs its own versions of those anyway.
4. **Repo convention.** Games are self-contained subtree projects, and earlier games already copy with credit (Fieldlark took its geo kit, instancing and quality tiers from Light Crossing).

**How the copy stays honest:**
- Every copied file starts with `// Copied from games/fieldlark/src/…` or `Adapted from …`, plus one line on what changed.
- `scripts/engine-drift.mjs` lists the copied files and the Fieldlark commit they came from, and diffs them. A later Fieldlark fix can then be ported on purpose, not by accident.
- **Suggested follow-up** (separate, owner-approved): extract `packages/diorama-engine` once a third 3D game wants it (the rule of three). It would come with a build-inputs hash that includes the package, and CI rules that run every dependent game.

**Copied as is** (header added; no logic changed):
- `render/`: `instanced` (culling layers, `Culler`), `materials`, `post` (bloom, SSAO, tilt-shift, ACES, grade, vignette, FXAA), `quality` (tiers and governor), `lighting` (sun path, dusk, night, seasons, shadow box), `sky`;
- `core/rng`, `ui/h`, `ui/layout` (HUD sizes, sideways-phone rail, supported viewports);
- later: `input/{gestures,controller,pick,gamepad}`, `ui/{panels,speech}`, `save/storage`, `audio/engine`, plus `scripts/{quiet-check,when-quiet,shots,drawn,check-build}` and the e2e helpers.

**Adapted:**
- `render/fx`: haze around the town; new patterns (brick, awning stripes, window glass); a `TINT` flag so one model takes any paint, patterned or not.
- `render/geo`: the new pattern ids.
- `render/camera`: the town's bounds.
- `style.css`: the same layout in the town's own colours.

**New for the city:**
- the ground shader (roads, sidewalks, curbs, crossings, lots, beach);
- the land and the bay;
- the town's model kit;
- citizens animated on the GPU;
- street life (traffic and walkers);
- the object view.

## How it differs from Fieldlark (and from the genre's big names)

| | Fieldlark | This game |
|---|---|---|
| About | farming: crops, animals, production chains | **planning a town**: roads, zoning, services, transit, citizens' happiness. No farming, crops or production chains |
| Setting | a sleepy community farm by a river, Larkford | a small **seaside town** on a bay, with a beach, a promenade, a lighthouse on its islet and sailboats |
| Cast | Hattie, the farmhands, Larkford's shopkeepers | Marisol the city planner and the townsfolk with requests (see Story) |
| Look | butter-yellow cottage, terracotta, meadow greens | **sea-glass teal, coral and sand**, pastel clapboard and brick, white trim, slate roofs, cooler lawns with mowing stripes, asphalt and paving |
| HUD | sage and butter | the same layout and sizes, in **teal and coral**, with the town's own icons (lighthouse coin, people, smile, roads, zones, transit, maps, City Hall) |
| Engine | — | shared look, lighting, shaders, culling, instancing, camera, side rail, quality tiers and budgets (copied) |

No names, characters, buildings, art, UI, currencies or text come from the genre's games. The game uses plain "coins" with an original lighthouse stamp. There is no premium currency.

## Time and kindness rules (built into the sim, tested)

- **Clock.**
  - Town time moves only while the town is on screen and active. Settings, story cards, a hidden tab and the menu stop it.
  - One day is 8 minutes of play (dawn, day, dusk, a lantern-lit night). A season is 5 days (40 minutes).
  - There are no real-world timers, no energy and no "come back later".
- **Payouts.**
  - Homes pay their town fee into the budget on their own.
  - Shops and workplaces fill a coin bubble over the building as town time passes. Tap it for a satisfying pop, or it collects itself after one town hour (1 minute of play), so nothing is ever lost.
  - The away bonus is capped and only helps: at most 10 minutes of payouts, like Fieldlark's.
- **Nothing is ever destroyed.**
  - No fires, disasters, crime, decay, abandonment or leaving citizens.
  - A missing service lowers a home's happiness a little (never below "a bit glum") and shows a helpful hint with "Show me".
- **Never stuck broke.** If coins can't pay for the cheapest useful step and income is below upkeep, Marisol brings a **city grant**: coins topped up to 500 and a day of half upkeep. A property test proves recovery from every broke state.
- **No pressure features.** No premium currency, purchases, ads, accounts, network, invite-friends, neighbours needed, gifting, chat, streaks or red dots. Counters are calm pills.

## The town

### Map and districts
- **The map.** An 80 × 80 tile grid beside the bay. The coast curves along the north, with a beach and a promenade. A small river mouth is in the west, and a hill rises in the south-east.
- **The land.** The town owns the **Old Harbor** at the start. Story chapters open four more named areas: Maple Row (suburbs), Greenway (parks), Seaside Boardwalk (waterfront) and Hilltop.
- **Districts appear by themselves.**
  - Each 8 × 8 area gets a character from what stands there: Downtown (mostly shops and workplaces), Suburbs (homes), Waterfront (along the shore), Park district (mostly green), or Mixed.
  - The labels float over the town when zoomed out and in the Maps view. City Hall says things like "Your downtown has 14 shops".
  - The town's name is the game's title by default. The player can rename it with a word-part picker, with no typing (the parts are checked for safety).

### Roads
- **Drawing.**
  - Drag on the grid to draw a road. It snaps to a straight line or an L, with a ghost, the cost, and Build / Cancel buttons.
  - Junctions, sidewalks, rounded curbs, crossings, centre lines and street lamps all appear by themselves; the ground shader draws them, so they cost no geometry.
- **Kinds.** Street, avenue (two tiles, chapter 3), bike lane (a flag on a street, chapter 5) and tram tracks (a flag, chapter 7).
- **Removing.** Roads can be removed for a full refund. Undo keeps 30 steps while building.

### Zoning and growth
- **Zones.** Paint homes, shops, workplaces or parks with a drag rectangle.
- **Lots.** Zoned tiles that touch a road form lots: 2 × 2 at first, 3 × 3 once the area grows.
- **Growth.**
  - On town time, the sim builds on the best empty lot the town has **demand** for. Scaffolding goes up for about 20 seconds of play, then a building pops.
  - Demand shows as three friendly bars: "Families want homes", "Shoppers want shops", "Workers want jobs".
- **Levelling up.** Buildings grow through 3 levels when their area is happy and served: cottage → townhouse → apartments, corner store → shop row → market hall, workshop → studios → offices. The model changes visibly.
- **Looks.** Tap a building to "Pick a look" from its 3 styles and 6 paints. Creative mode lets you place any building directly.

### Buildings
- **Homes** hold residents: 3 / 6 / 14 by level.
- **Shops** need shoppers nearby and give jobs (2 / 4 / 8).
- **Workplaces** need workers nearby and give jobs (6 / 12 / 24): a workshop, a boatyard, offices, a studio.
- **Public services** cover a circle (shown while placing) and raise happiness there:
  - school (radius 12), library (12), clinic (14), safety station (14), community center (10), park (6);
  - plus a recycling center (16, chapter 5).
- **The safety station** is the fire station as a *safety* service: smoke-alarm checks, bike-helmet lessons, a ladder truck that helps a cat down a tree. There are never fires.
- **Original landmarks**, unlocked through the story:
  - the restored Lighthouse (chapter 1);
  - the Clock Tower City Hall upgrade (2);
  - the Seaside Pier and its Ferris wheel (6);
  - the Glasshouse botanic garden (5);
  - the Aquarium (6);
  - the Hilltop Observatory (7);
  - the Festival Bandstand (8).

### Citizens
- **Aggregate needs.** Residents are counted per home; their needs are aggregate, so there is no per-person save:
  - **home** (always);
  - **work**: workers with a job within reach, by road or by transit;
  - **fun**: shops, café, community center within 10;
  - **nature**: a park or trees within 5;
  - **services**: school, clinic, safety and library coverage;
  - **calm**: little traffic on its street.
- **Visible citizens.** A pool of agents on screen walks the sidewalks, cycles bike lanes, waits at stops, rides buses and trams, and drives. They come from homes and go to their destinations. The pool size depends on the tier and is drawn only near the view (one draw call; arms and legs swing in the vertex shader).
- **Tapping a citizen** shows a thought bubble about their home's least-met need ("I'd love a park near home!" or "The bus would help me get to work"), with **Show me**.

### Happiness and population
- **Scores.** Each home's happiness is a base plus weighted needs, from 30 to 100. The city's happiness is the population-weighted average, shown as a smile pill. Population is the sum of residents.
- **Maps** (overlays): happiness, services (pick one), traffic and greenery.
  - Each is a heat tint in the ground shader plus colour-coded buildings, with a legend.
  - **Colorblind patterns** (dots, stripes, cross-hatch) come from Settings.
  - A one-line tip explains how to read each map ("Green streets flow; orange ones are busy").

### Budget and City Hall
- **Money.**
  - **Income**: home fees (per resident per day), shop and workplace payouts, and the ferry and tram once they open.
  - **Upkeep**: services and transit per day. Parks cost a little; roads are free.
  - Coins flow continuously; payouts come by tap or by themselves.
- **City Hall.**
  - Friendly SVG charts: today's income by source and upkeep by service as bars; savings over the last 12 days as a line; "profit per day" with a smile or a thinking face.
  - Plain lessons: "Services cost money, but they make people happy, and happy towns grow."
- **Mistakes** only slow growth.

### Transit and traffic
- **Trips.** Each home makes car trips to jobs and shops. Trips are routed on the road grid by shortest path with a turn cost and added up per road tile. Load over capacity gives congestion.
- **What you see.** Car density follows load, and jammed tiles slow their cars. The traffic map colours the roads. Everything is recomputed when the town changes and every town hour, and it is unit-testable.
- **Fixes:**
  - more connections and avenues;
  - **bus routes**: tap stops in order to make a loop; homes within 4 tiles of a stop move part of their trips to the bus; Kofi drives the first bus;
  - **bike lanes**: short trips by bike when both ends are on the network;
  - **the tram** (chapter 7): big capacity on its line.

### Green city
- **Eco rating** (0–5 leaves): trees per person, park share, **solar roofs** (a roof upgrade that changes the model), recycling coverage, and transit and bike share.
- **Short, real explanations**, from one reviewable `facts.ts` with a `check` source per fact. For example: trees shade and cool streets; solar panels turn sunlight into electricity; recycling turns old cans into new ones; one bus can take many cars off the road.

### Seasons and night
- **The look.** Fieldlark's approved lighting and grade, with snow settling on roofs in winter.
- **At night**, windows and street lamps glow, and there are stars.
- **Seasonal decorations** appear by themselves, never as gifts:
  - spring: blossom trees and bunting;
  - summer: beach umbrellas and boats;
  - autumn: leaves and lanterns;
  - winter: lights on the lamps and a tree in the plaza.

## Goals and story

**Setting.** A small seaside town has gone quiet since its old Bay Festival stopped. The town council makes you the **junior mayor**. Marisol, the friendly city planner, helps you bring the town back to life, until the whole bay comes to the festival.

**Cast** (web-checked; see Names): Marisol Vega (city planner, the guide); Teodor (the old lighthouse keeper, who knows the town's history; nobody goes missing); Captain Noor (ferry); Dr. Lin (clinic); Rania (café); Ozzie (a kid who wants a skate park); Mr. Abernathy (library); Gemma (green-city champion); Chief Dalia (safety station); Auntie Pearl (festival organizer); Kofi (bus driver; "Benny" was dropped).

**Chapters** (minutes of play, target):

| # | Chapter | Main goals | Unlocks | Min |
|---|---|---|---|---|
| 0 | The Junior Mayor | first road, 4 homes, the first family moves in, a corner store | Look, Roads, Home and Shop zones | 15 |
| 1 | Main Street | 60 people, Rania's café, a pocket park, collect payouts; restore the Lighthouse | Parks, trees and benches; **Creative mode** after this chapter | 40 |
| 2 | School Bells | school and library, the services map, the first jobs | Work zone, School, Library, Maps | 45 |
| 3 | Busy Streets | traffic appears; Kofi's first bus route; an avenue | Transit (bus), avenues, traffic map; City Hall clock tower | 50 |
| 4 | Maple Row | suburbs open; clinic and safety station; City Hall charts | Maple Row land, Clinic, Safety station, Community center, budget charts | 50 |
| 5 | Greenway | park district; eco rating; recycling, solar roofs, bike lanes | Greenway land, Glasshouse, greenery map | 55 |
| 6 | Seaside Boardwalk | waterfront: boardwalk, pier, aquarium, Captain Noor's ferry | Boardwalk land, Pier and Ferris wheel, Aquarium, ferry | 55 |
| 7 | Hilltop Tram | the hill; a tram line; the Observatory | Hilltop land, Tram | 60 |
| 8 | The Bay Festival | everyone at least 75% happy, every service, landmarks; the Festival Bandstand; the festival night with lanterns and kites | the ending, credits, endless goals | 60 |
| | | | | **≈ 7.2 h** |

- **After the credits:** endless rotating town projects, plus gentle optional seasonal days (a kite day, a beach day, a lantern walk, winter lights). No streaks.
- **Creative mode** unlocks after chapter 1. It is a new town in any slot: unlimited budget, everything unlocked, nothing judged, no goals, pure building.

## Pacing target

- **The story** is 6–8 hours of play; the target is about 7.2 h, from the chapter table above.
- **The bot** (Fieldlark's playthrough bot, adapted) plays like a kid: about 6 s per action, learning pauses the first time it does something, and reading time counted. It runs on 6 seeds. Targets:
  - every town reaches the credits;
  - mean 6–8 h, with no seed outside 5.5–8.5 h;
  - no chapter over 75 minutes;
  - no wait for coins over 90 s of play;
  - starting any chapter with 0 coins still finishes it (the grant).
- **No single strategy dominates.** From a chapter-5 town, 2 hours of each of these: only homes and shops; only one service type; no transit; maximum trees; avenues everywhere. None earns more than 15% over the balanced mix, and none reaches higher happiness than the mix.

## Saves (estimate for a maximum town; budget 150 KB worst case)

**Format.** A compact, versioned save (Fieldlark's format-2 ideas from day one), with migrations and fixtures. Per-person agents are never saved; they are derived. The parts and their worst case:

| Part | Worst case | Notes |
|---|---|---|
| Header, coins, clock, unlocks, settings-in-town, stats | 1.2 KB | |
| Tile layer (80 × 80: road kind, flags, zone, finish) | 6.3 KB | one character per tile, run-length coded; a real town is about 1.5 KB |
| Buildings (cap 900) | 5.4 KB | def, x, z, turn, level and look packed in 5 base-64 characters, plus 1 for payout progress |
| Trees and decorations (cap 1,500) | 6.0 KB | 4 characters each |
| Transit (8 bus routes × 24 stops, tram stops) | 0.5 KB | |
| City Hall history (12 days × 8 series) | 0.4 KB | |
| Story, goals, requests, flags | 1.6 KB | |
| JSON framing | 0.5 KB | |
| **One copy, maximum town** | **≈ 22 KB** | the codec enforces a **28 KB** cap: it refuses and keeps the last save |

**Keys.** `<prefix>slot1`–`slot3`, `<prefix>bak` (a backup of the slot last saved, written only after that save worked), `<prefix>broken` (only if a save can't be read), `<prefix>settings` (under 1 KB) and the probe.

**Totals.**
- **Every key at its cap:** 5 × 28 + 1 ≈ **141 KB**, under 150 KB.
- **Heavy real play:** three maximum towns plus a backup is about 88 KB. A town at the credits is estimated at 10–14 KB a copy, measured on bot playthroughs in the balance phase.

**Behaviour.**
- Saves happen every 30 s of play when something changed, on `visibilitychange` (hidden) and on `pagehide`.
- A full storage area shows one friendly "Out of room to save" card, keeps the last good save and keeps playing.
- The capture route and test shortcuts never write real slots: test towns go into an in-memory store, and a shortcut only ever uses an empty slot.

## Controls and UX

- **Touch.**
  - Tap to look and collect.
  - Drag to draw roads and paint zones. A drag that starts where the tool can't act pans.
  - Pinch to zoom; twist two fingers to turn in 45° steps.
- **Mouse and keyboard.** Click; drag to draw; drag empty ground or use the right button to pan; wheel to zoom; Q/E turn; WASD or the arrows pan; number keys pick tools by their label; T focuses the tool bar; Esc goes back; Ctrl/Cmd+Z undoes.
- **Gamepad.**
  - The left stick moves a tile cursor; the right stick pans; LB/RB turn; LT/RT zoom.
  - A starts a road and A again ends it (the same for zone rectangles); B goes back; X opens the tools; Y opens the maps; Start opens the menu.
  - Menus use focus navigation.
- **Layout.** Fieldlark's HUD and **sideways-phone side rail** (style.css plus `ui/layout.ts`), "Tools on the left", **48 px tap targets**.
  - The same tile-size minimums: zoom 32–240 px per tile; starting zoom at least 64 px on phones and 80 px on tablets and computers.
  - The same **tap-reachability test**: every tile can be framed and tapped at every supported viewport, with a 44 px finger at 3 or more of the 8 turns.
- **Settings.** Music and sound volume, **read-aloud** (local voices only), **larger text**, **colorblind patterns** on maps, **reduced motion**, quality (Auto, Low, Medium, High) and tools on the left.
- **Onboarding.** A one-time tip the first time each tool appears, and gentle hints if the player seems stuck (after 150 s, then every 240 s). Every story line and tip is grade 7 or below.

## Tech and the game contract

- **Build.** One self-contained `dist/index.html`, under 3 MiB (aiming for about 1.5 MB). It works from file:// and in the site's sandboxed iframe, with no network requests (build CSP plus a check). Three.js is pinned at 0.186.1.
- **Code layout.**
  - **`src/sim/` is pure**: no DOM, no `Date`, no `Math.random`; seeded RNG; a purity test enforces it. It is split into `map`, `clock`, `city` (the save's shape), `roads`, `zoning`, `growth`, `demand`, `citizens`, `coverage`, `happiness`, `budget`, `traffic`, `transit`, `eco`, `story`, `goals`, `grant` and `actions`. The single `act()` dispatcher serves the UI, the bot, undo and the tests.
  - **`src/data/`**: `things` (buildings, props, looks), `zones`, `services`, `needs`, `chapters`, `cast`, `facts`, `tips` and **`tuning.ts`**, which holds every balance number.
- **Manifest.** `game.json`:
  - ages "8–14", genres Simulation and Strategy;
  - keywords "city builder", "city planning", "3d city game", "town builder", "kids city game", "browser game", "offline game" (no franchise names);
  - `embed: "fullscreen"`, `moods: ["creative", "cozy"]`, `sessionMinutes: [15, 45]`.
- **Performance.**
  - 60 fps on mid-range phones with a maximum town, through the tiers plus the governor.
  - Low's budget, measured after culling, matches Fieldlark's: about 150k triangles drawn at the starting zoom, and draw calls in the Low range (≤ 66).
  - How: one instanced layer per model; culling per instance; ground chunks; a **two-level LOD** for buildings (full and far models; far ones beyond 18 tiles from the view's centre and on Low when zoomed out); citizen and car pools capped per tier and drawn only near the view; blob shadows for things that move, so the shadow map stays still.
- **Lessons from earlier games, built in:**
  - frame-rate-independent test helpers (`?speed=N` and fixed-step sims);
  - quick taps latched so they always count;
  - one browser worker on CI;
  - test shortcuts never overwrite a real save;
  - fake gamepad presses last exactly one frame;
  - the ghost-click shield on panels.

### The style frame, measured (2026-10-14, M3 Pro, `scripts/shots.mjs`, steady frames)

Each cell is draw calls / triangles / fps. The phone is 390 × 844 at 3× with a start zoom of 64; the desktop is 1440 × 900 at 2× with a start zoom of 80. "Zoomed out" is 32 px per tile.

| Tier | Phone, start | Phone, zoomed out | Desktop, start | Desktop, zoomed out |
|---|---|---|---|---|
| Low | 31 / 77k / 60 | 36 / 111k / 60 | 36 / 126k / 60 | 45 / 171k / 60 |
| Medium | 41 / 100k / 60 | 45 / 145k / 60 | 46 / 156k / 60 | 55 / 217k / 60 |
| High | 74 / 197k / 60 | 82 / 391k / 60 | 82 / 339k / 54 | 101 / 536k / 49 |

- **Low** is inside Fieldlark's budget (≤ 66 draw calls, about 150k triangles at the start view). Only desktop zoomed out goes over, and Fieldlark's was over there too (70 / 176k).
- **Desktop High** was measured while another session's preview capture had a Chrome window rendering. It gets re-measured on a quiet machine in phase 9, after the building LODs and lighter window details land. A cottage is 2.2k triangles today; the far LOD aims for under 300.
- **The single-file build** is 817 KB.
- **Traffic, headless** (`scripts/streetlife-check.mts`): 3 minutes of 17 vehicles, with no two cars closer than 0.33 tiles (the opposite lane) and no wait over 1.7 s.

## Testing and balance

- **Unit tests:**
  - zoning and lots, growth and demand, coverage, happiness (including "never below the floor"), the budget and the grant property;
  - traffic assignment and congestion, transit mode share, citizens' needs;
  - save codec, migrations with fixtures, the 28 KB cap, full storage, prefix-only storage;
  - sim purity, readability, facts, kid-safety and IP-name scans, and every-tile reachability.
- **Simulations:** the bot plays from a new town to the festival with no dead ends; no strategy dominates; pacing lands in 6–8 h.
- **Browser tests** on Chromium and WebKit, at phone portrait, phone sideways, tablet and desktop:
  - drawing roads, zoning and placing by touch and by mouse;
  - maps, the budget screen and Creative mode;
  - save and reload, file:// and the sandboxed iframe;
  - no console errors and no network requests;
  - 48 px layout checks, a fake gamepad, reduced motion.
- **Visual review.** Every district, season, night and menu at each tier, compared with the approved style frame. The `scripts/shots.mjs` numbers are logged.

## Names (phase 0: five proposals, web-checked 2026-10-14; the owner picks one)

**How they were checked.**
- Store searches: Steam's and Google Play's own search; the App Store through Apple's search API; itch.io through `site:` searches (its own search didn't load).
- Then general web searches for any game, app, toy, board game, kids' character, brand or trademark with the same or a confusingly similar name.
- Each finalist's search was repeated as a spot check.
- These are search-index checks, not registry searches: run the pick through USPTO, EUIPO and UKIPO before launch.
- The title also names the town ("Welcome to Tidewick!").

**Proposals.** None turned up a game, app, toy or brand with the same name:
1. **Tidewick** (recommended). "-wick" is an old word for a village: a storybook seaside town, easy to say (TIDE-wick).
   - No store hits.
   - Nearest: *Tidewatch*, an unreleased Steam RPG (a different name; its plot is a missing lighthouse keeper, so ours never has one); *Tideward*, a 2027 board game; *Tidewake* on itch.io.
2. **Bayloom.** A bay town that blooms as you build it.
   - No store, company or web hits.
   - Nearest: *BEELOOM* (a trademark application for wooden toys) and *Bebloom* (a florist).
3. **Kitebay.** Kites over the harbour hint at the breeze and the festival; two simple words.
   - No store hits.
   - Nearest: *KiteTheBay*, a kitesurf school. Some readers may see "Kit-eBay".
4. **Harborly.** Warm, and says "harbour town" at once.
   - No store hits.
   - Nearest: *Harbor Life Idle*, a mobile game (a different name). The US spelling.
5. **Breezeport.** A sunny port town where ferries and buses come and go.
   - No store or brand hits.
   - Nearest: *Breeze Airways* (an airline).

**Spares:** Saltbright (clear, but harder for young kids to say), Brightbay (a UK real-estate firm has the name), Pebble Bay (close to a famous golf trademark).

**Checked and dropped:**
- **Gullwick:** the ferry route's town in a 2026 Steam co-op ferry game.
- **Bayblock:** an app called "Bay Block" on both stores.
- **Puffin Point:** too close to a preschool island TV show and a children's book imprint.
- **Lanternbay:** a game studio on Steam.
- **Sunnybay:** too close to an existing seaside resort city-builder, and a Google Play developer.
- **Seawick:** a real holiday park, and it reads like "seasick".
- **Plan & Pier:** clear, but it can't be a town's name.
- **Agent City** (from the project label "Agent City Builders"): a Roblox game and a hackathon city game share it. "Agent City Builders" itself is clear as an internal label only.

**Cast and places**, checked against kids' TV, books and games:
- All clear except the bus driver: "Benny" is a digger in a classic building show, so he becomes **Kofi**.
- "Hilltop" is generic (an adult show has a community called the Hilltop): low concern, kept.

## Phases

**Every phase:**
1. Check the disk and `git log` for foreign commits.
2. Build the phase.
3. Typecheck and run the unit tests, then the browser tests through the quiet check.
4. Play it in the browser pane.
5. Update `CLAUDE.md`.
6. Commit as "<Name>, phase N: …".

| # | Phase | What lands |
|---|---|---|
| 1 | Setup and name | branch from `origin/main` after Fieldlark merges; scaffold with the owner's name (slug, prefix, hook, ports); engine copied from the merged Fieldlark, with `engine-drift.mjs`; **"cityville" (and "zynga", if not already there) on the trademark blocklist**, plus a site manifest test; the brief in `docs/prompts/<slug>.md` with the inspiration replaced by "[a city-building social game]"; README row; root `CLAUDE.md` pointer; game `CLAUDE.md` with the **IP log** (the three screenshots logged as quality references only, never committed) |
| 2 | Engine and world | the full 80 × 80 map with the coast, river mouth and hill; ground shader; camera and input; picking plus the reachability test; HUD shell and side rail; slots, settings, compact save v1; capture route (`?scene=styleframe` and others); hook; tiers and governor |
| 3 | Roads and zoning | road drawing and kinds, undo, refunds; zones and lots; demand and growth; scaffolding; payouts and tap-collect; the grant |
| 4 | Citizens and services | needs, coverage, happiness; the six services; thought bubbles; the four maps with colorblind patterns |
| 5 | Traffic and transit | the trip model and congestion; visible traffic; bus routes, bike lanes, the tram; the traffic map |
| 6 | Budget, City Hall and green city | charts and lessons; eco rating, solar roofs, recycling; `facts.ts` |
| 7 | Story and Creative | 9 chapters, cast, requests, landmarks, onboarding, stall hints, the festival, credits, endless goals; Creative mode |
| 8 | Look and sound | seasons, night, decorations, gentle weather, landmark art, LODs, synthesized music and sound; visual review against the style frame |
| 9 | Balance, saves, performance, QA | bot and pacing, dominance sims, maximum-town performance, the full e2e matrix, accessibility |
| 10 | Ship | finalize the name; listing; `import-game`; storage audit; previews, cover, logo, OG image, 15 s trailer; MCP catalog `embed`; site grid count; PR, CI green, preview link. **Stop before production.** |

## Risks
- **Fieldlark's or Shooberry's merge order.** `site.order`, game counts and generated files get reconciled at the ship step; `main` is merged, never rebased.
- **CI's software WebGL.** The Low tier must pass on SwiftShader, as Tuck Pop's and Fieldlark's do; otherwise the game joins `LOCAL_SUITES`.
- **A maximum town on phones.** LOD, culling and capped agent pools, measured with a maximum-town script (like Fieldlark's `maxfarm.mts`).
- **Scope.** A data-driven content layer, one model kit, and the bot catching balance holes early.
- **The shared machine.** Every heavy run goes through the quiet check, and Docker is asked about before timing-sensitive runs.
