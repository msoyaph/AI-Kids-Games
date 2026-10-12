# Light Crossing 2.0: implementation report

Light Crossing is a cozy island life-sim for ages 6 and up. It runs in the browser as one self-contained HTML file.

**What's in this version:**
- the original story: about 6 hours, 5 chapters, 32 missions;
- a full post-story year;
- full play on desktops, phones and tablets.

This report covers what was built, how it was tested, what ships, and what is still rough.

## At a glance

| | |
|---|---|
| Version | **2.0.0**, tag `v2.0.0` on `main` (local only; the repository has no remote and nothing was pushed) |
| Build | `dist/index.html`, **1,250,266 bytes** (1.19 MiB, 362 KB gzipped) against a 2 MB limit |
| SHA-256 | `7730e932006a60cc50f2112548c387a97f26ceb650fb7cf279360abea8b732c8` (the build is reproducible: building twice gives the same hash) |
| Runs | from `file://`, from any web server, and inside `<iframe sandbox="allow-scripts">`. No network requests, no external assets |
| Plays on | desktop (keyboard, mouse, gamepad); phones and tablets by touch, in portrait and landscape; a Bluetooth keyboard or gamepad on a tablet |
| Story | 5 chapters, 32 missions, 23 in-game days, about **5.9 hours** (pacing model) |
| After the story | 4 seasons (7 days each), 4 festivals, recurring contests, a traveling merchant, meteor nights, birthdays, a basement |
| Tests | **222 unit tests** (1 skipped), **191 browser tests**, including Chapter 1 played by touch alone on 8 device setups |
| Performance | phone profile (CPU 4× slower): **60 FPS** average, 59.5 FPS 1%-low on Low; tablet profile: **60 / 59.5** on Medium |

## Release handoff

### Final build

- **Path:** `dist/index.html` (rebuild with `npm ci && npm run build`)
- **SHA-256:** `7730e932006a60cc50f2112548c387a97f26ceb650fb7cf279360abea8b732c8`
- **Size:** 1,250,266 bytes

### Storage keys

The game uses `localStorage` only, and every key starts with `lightcrossing.`. The slug is `light-crossing`.

| Key | What | Size |
|---|---|---|
| `lightcrossing.slot0`, `lightcrossing.slot1`, `lightcrossing.slot2` | the three save slots | ~8 KB new game, ~22 KB at the end of the story, ~23 KB a year later; budget 300 KB (a synthetic maxed-out save is ~151 KB) |
| `lightcrossing.settings` | volume, text speed and size, read-aloud, quality, camera, controls, playtest switch | < 1 KB |
| `lightcrossing.playtest.slot0`–`slot2` | only when playtest mode is turned on | up to 64 KB each, dropped first if storage is full |
| `lightcrossing.__probe` | written and removed at start-up to check that storage works | 0 |

Version 1 saves (the first release, format v2) upgrade automatically and keep everything. Tests check this against real
saves captured from the first release.

### Registry entry

`docs/registry-entry.json` is generated from the build by `npx tsx scripts/registry-entry.ts`. The site's own schema
isn't in this repository, so the entry has every field it's likely to need:

- slug, title, version and description;
- ages 6+;
- file name, size and SHA-256;
- no network;
- embed settings: `sandbox="allow-scripts"`; `allow-same-origin` is optional and only needed for saves to persist;
  `allowfullscreen` is optional and only needed for the fullscreen button;
- input methods (touch, keyboard, mouse, gamepad);
- devices (phone, tablet, desktop), any orientation;
- storage prefix, keys and budget;
- the preview route;
- playtime.

### Preview capture route

Open the built file with `?preview=<scene>`. You get a staged picture with no HUD that comes out the same every time.
Nothing is saved.

- **Scenes:** `cover` (the default), `spring`, `summer`, `autumn`, `winter`, `festival`, `home`, `shop`, `villager`.
- **When to capture:** `window.__previewReady` becomes `true` when the scene is ready. Wait about one more second for the
  first frames.
- **Suggested sizes:** 1280×720, 1080×1080, 720×1280.

The island, interiors, seasons and HUD have all changed since 1.0, so the site's cover art and previews should be recaptured.

## What the game is

Driftlight Isle is a sleepy island. You arrive, pitch a tent, and meet Pemberly the capybara. Over five chapters you
befriend eight neighbors, fill a three-wing museum, upgrade your home, and build bridges and ramps. You make the island
glow bright enough for the Lantern Crossing festival, which relights the old lighthouse.

| Area | What's there |
|---|---|
| Activities | foraging, crafting (97 recipes), fishing with a reel minigame, bug catching with sneaking, digging, gardening and flower breeding, selling, home loans |
| People | 8 villagers with personalities, schedules, gifts, requests and friendship rewards, plus 4 other characters: Pemberly, Fennimore, Vesper and Wanda the heron |
| Collections | 42 fish, 42 bugs, 18 fossils, 88 furniture pieces, 46 clothing pieces; 398 items in all |
| Places | walk-in interiors for the home (3 tiers plus a basement), the museum, the shop, Lantern Hall and all 8 villager homes |
| Goals | 32 story missions, 3 daily challenges from a pool of 20, 44 tiered achievements, the Lumen Exchange, the island rating (1–5 lanterns) |
| After the story | seasons with their own fish, bugs, flowers, forage and recipes; Flower Fair, Star Night, Harvest Feast and Lantern Skate; the fishing tournament and bug-off every season; Wanda; meteor nights; birthdays; the glow streak; the Golden Lantern Statue |
| Decorating | floor, wall and tabletop furniture with undo; outdoor decorations you can move, turn and nudge; a closet with 3 saved outfits; a dye station |
| Young players | read-aloud in each speaker's voice, every line at an early-reader level (checked automatically), three text sizes, Pemberly's hints when you're stuck |

**Art and sound:**
- All art is low-poly geometry generated in code, on a "rolling world" curve.
- All music and sound effects are synthesized live with the Web Audio API.
- The build has no image, audio or font files.

## How it's built

TypeScript (strict) with Three.js, bundled by Vite into one file with `vite-plugin-singlefile`. The code is about 28,000
lines across 141 modules. The simulation is kept separate from rendering:

| Folder | What it holds |
|---|---|
| `src/core/` | seeded random numbers, noise, a typed event bus, math helpers |
| `src/world/` | the deterministic island generator: an 80×80 map with three height levels, a pond, a river and three regions |
| `src/sim/` | every game rule, with no DOM and no Three.js. State is plain JSON, and systems are functions over `Game` |
| `src/render/` | Three.js. It only reads state and listens to events. Includes the curved-world shader patch, terrain chunks and instanced objects |
| `src/input/` | keyboard, mouse, gamepad and touch input combined into one input frame; tap-to-move picking and pathing |
| `src/ui/` | the DOM overlay: HUD, menus, Glowpad, editor, touch controls, read-aloud |
| `src/audio/` | the synthesizer and the generative music |
| `src/data/` | all content as typed data. Adding content means adding data |

Saves use a compact versioned format (v3), with migrations and quota-safe writes. Every write is checked by reading it
back. A failed write never touches the previous save; the player sees a kid-friendly "Storage is full" notice.

## How it got here

The work came in three passes. Each step was one commit.

1. **First release (phases 1–10):**
   - the island, movement and the day/night cycle;
   - items, tools and foraging;
   - fishing, bugs and the museum;
   - the economy, crafting, homes and interiors;
   - villagers and the mission engine;
   - challenges, achievements and building;
   - audio and polish;
   - end-to-end tests and the pacing model.
2. **Upgrade (phases 0–10):**
   - the compact save format and storage budget;
   - playtest mode and stall hints;
   - walk-in interiors;
   - wall and tabletop decorating;
   - seasons;
   - clothing;
   - festivals and happenings;
   - young-player features;
   - quality tiers and the benchmark;
   - CI workflows;
   - a test that plays a full year after the story.
3. **Touch and release (steps 1–6):**
   - an audit of every screen;
   - phone and tablet layouts, touch controls, and mobile-browser behavior;
   - a touch-only test suite;
   - this release.

## Touch: what changed

The audit (`docs/touch/AUDIT.md`) opened 37 staged screens on phone and tablet sizes in Chromium and WebKit with touch
emulation. It found **950 layout issues (257 distinct)**, and five things were impossible by touch alone:

- pausing, saving and quitting;
- the tool ring;
- reeling on portrait phones;
- reaching "Set sail!" and the closet in landscape;
- the editor on portrait phones.

Now there are **0 layout issues** on every screen, at 10 viewports, in both engines. Everything can be done by touch.

| Before | Now |
|---|---|
| No way to pause, save or quit by touch | A ☰ button: Resume, Save, Settings, Full screen (where supported), Controls, Save & quit |
| Tool ring unreachable | The Tools button shows what's in your hand and opens a ring sized to the screen |
| Reel bar sat on the A button (portrait) | Hold anywhere to reel; the reel bar sits in the HUD and never catches touches |
| Creator and closet cut off in landscape | Every menu scrolls inside the safe area |
| Editor covered the room on phones | Drag pieces around; a pieces drawer (＋ Add); one toolbar with nudge, Turn, On table / On floor, Put away, Walls, Undo |
| Stick only in one corner; running meant pushing to the edge; sneaking needed two thumbs | A floating stick anywhere: a small push sneaks (🐾, quiet and slow), the edge runs, and you can also tap to walk there |
| No idea which tile a tool would hit | A ring on the exact tile the action will touch (green when something will happen) |
| 32 px buttons; 🔊 on top of dialogue choices | 48 px minimum on touch devices; 🔊 moved inside the dialogue box |
| "Esc to cancel" when placing | ✔ Place / ✕ Cancel buttons, and prompts worded for the input you're using |
| Toasts piled over menus and the tracker | A HUD layout pass: nothing overlaps, toasts queue, and HUD buttons sit above the touch layer |
| Notch and home bar covered the HUD | Everything sits inside the safe area (tested with simulated notches) |
| iOS zoom, pull-to-refresh, long-press menus; silent audio and read-aloud | Blocked during play while menus still scroll; audio and speech unlock on the first tap |
| Locking the phone didn't pause | It saves, pauses and silences the game, then resumes cleanly |
| Auto quality picked Medium on 8-core phones | Phones start on Low |

Before/after phone screenshots, with before on the left and after on the right:
- [portrait, 390×844](touch/compare-phone-portrait.jpg)
- [landscape, 844×390](touch/compare-phone-landscape.jpg)

Single shots are in `docs/touch/before/` and `docs/touch/after/`.

**Bugs the touch tests found.** Several affected every input, not just touch:

- **Workbench taps:** tapping the workbench could walk you to the ground behind it. At this camera angle a low object
  covers the tile behind it. A tap inside a building's outline now picks the building.
- **Net vs. tree:** with the net out, A shook a tree with a bug on it instead of swinging the net. Affected every input.
- **Menu tips:** the crafting, shop and pockets tips appeared after you had closed that menu. They now show inside it.
- **Rod:** putting the rod away left the line in the water, so touch stayed in "hold to reel" mode.
- **Fennimore:** you couldn't reach him behind the shop counter by tapping him.
- **Rooms on portrait phones:** rooms were cut off at both sides, with the tent's bed half off screen. The indoor
  camera now backs off until the whole room fits.
- **Tracker on small phones:** the full mission list covered part of the room (the tent's bed). Small screens now show
  just the next step.
- **Touch controls lost:** a page class collision made the editor and "Tap to continue" untappable on touch devices.
  Separately, after using a keyboard, the touch controls never came back.
- **Lantern Skate:** fast skaters could pass through a ring between checks.

## Testing and verification

All of this was run on `main` after the merge.

| Check | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` (vitest) | **222 passed**, 1 skipped. Includes a full new game → finale playthrough in each season, a full year after the story, save migration from real first-release saves, the storage budget, and the reading level of every line |
| `npm run build` + `npm run size` | 1,250,266 bytes, under the 2 MB limit; reproducible hash |
| `npm run pacing -- --check` | 5.86 h over 23 days (target 5.5–6.5 h) |
| `npm run e2e` | **191 browser tests** (see below) |

In the final full run, 190 tests passed on the first try. The phone-landscape playthrough ran out of its 5-minute
bug-catching allowance while 4 browsers ran at once: it caught one bug. The allowance is now 8 minutes, and the test
passed on rerun.

**Browser tests (Playwright, GPU on macOS):**
- **Desktop (3 tests):**
  - a new game with keyboard and mouse and no console errors;
  - the file running from `file://` and inside a sandboxed iframe;
  - a save made inside Lantern Hall resuming inside after a reload, with only `lightcrossing.*` keys.
- **Touch (168 tests):** 8 setups, Chromium and WebKit × phone and tablet × portrait and landscape. Each setup runs:
  - **20 spot checks:** stick and sneak, tap-to-move, fishing and reeling, bugs, digging, the shop, crafting, the editor,
    the closet, a contest, a festival, settings, pause and save, context loss, and more;
  - **all of Chapter 1, played with real touches only:** a new game, Pemberly, gathering, the camp, four tools, two fish,
    two bugs, digging, chopping, the evening talk and the first night's sleep. The test player reads the screen through
    read-only helpers and acts only by tapping, holding and dragging. It taps only where the game would actually pick
    what it's aiming at. All 8 setups pass, in 5–7 minutes each.
- **Layout (20 tests):** every screen at 10 viewports (360×800, 390×844, 430×932, 820×1180 and 1024×1366, each in both
  orientations) in both engines. The checks cover:
  - nothing off screen;
  - nothing under a simulated notch or home bar;
  - no tap target under 48 px;
  - no overlapping or unreachable buttons;
  - the HUD never covering a menu;
  - no text under 12 px.

## Performance

`npm run bench` builds a busy late-game island in memory: the Harvest Feast at 6 PM. It walks a scripted route for 30 seconds.

| Setup | Tier | Average FPS | 1% low FPS | Draw calls | Triangles |
|---|---|---|---|---|---|
| Desktop, 1280×800 at 2×, uncapped | Low | 354 | 119 | 282 | 89k |
| | Medium | 240 | 83 | 510 | 147k |
| | High | 227 | 89 | 507 | 153k |
| **Phone** profile, 390×844 at 3×, CPU 4× slower, vsync | Auto → Low | **60** | **59.5** | 235 | 87k |
| **Tablet** profile, 820×1180 at 2×, CPU 4× slower, vsync | Auto → Medium | **60** | **59.5** | 507 | 147k |

The JavaScript heap was 18 MB on the phone profile and 22 MB on the tablet profile. The profiles slow only the CPU; the GPU
is still an Apple M3 Pro. See "Still awkward" below.

The Auto setting starts on the device's tier and steps down if frames drop: after 2.5 s under 42 FPS it goes down a tier,
and after 10 s over 57 FPS it goes back up.

## Privacy and safety

- **No network:** the game makes no network requests and loads nothing from outside the file.
- **Nothing personal:**
  - The only player input is a name you make up and how your character looks.
  - It never asks for a birthday or any other personal information. Villager birthdays are fixed days in the game's calendar.
  - Playtest mode is off by default. When on, it records only play time, menu time and activity counts on the device,
    with no names, timestamps or device data, and exports only when you press Export.
- **Saves:** they stay in the browser under `lightcrossing.*` keys.

## Still awkward

- **Real devices are untested.** All touch testing used Chromium and WebKit touch emulation on a Mac, plus a CPU-throttled
  benchmark. These are untested on hardware:
  - phone GPUs;
  - iOS Safari quirks: the first-tap audio unlock, read-aloud voices, real notches;
  - Android Chrome.

  A short session on an older iPhone and a mid-range Android tablet, with Settings → Test performance, is the next step.
- **Taps right next to taller things are ambiguous.** The camera looks down at a low angle, so small things directly
  behind a building or tree are hard to tap. Taps now pick whatever is in front. Use the stick for those.
- **The rod changes what a tap does.** With the rod out, a tap within about 1.6 tiles of the bobber spot casts instead of
  walking. That's deliberate, so casting is easy, but it can surprise someone walking along the riverbank.
- **Small phones are tight.**
  - Portrait: the top HUD band and the first-time tip boxes take up a fair bit of the screen. Tips close after 9 s or on a tap.
  - Landscape (390 px tall): the dialogue box covers about 40% of the height.
- **Calls hide the controls.** Pemberly's calls can arrive right as you reach for a button, and the touch controls hide
  while she talks. This is harmless but can feel abrupt; it was also the main source of flaky test runs.
- **WebKit closed once.** During one test run (out of more than 10) the headless WebKit page closed on its own. It never
  happened again with crash logging on. Watch memory on older iPhones.
- **Fullscreen:** the button is hidden where it can't work: iPhone Safari, and iframes without `allowfullscreen`.
- **Audio:** it starts after the first tap or click (the browser's autoplay rule).
- **Pacing:** the 5.9 hours is a model estimate, not measured with players. Playtest mode and
  `npm run analyze-playtests` are there to measure it.
- **CI:** the workflows exist but have never run, because there's no remote. The self-hosted GPU runner should only be
  used with a private repository (`docs/CI.md`).
- **`npm audit`:** it flags `braces` through `vite-plugin-singlefile`. That's a build-time dependency only.

## Running it

```
npm ci
npm run dev            # play locally
npm run build          # dist/index.html
npm test && npm run e2e
npm run bench -- --profile phone
```

Everything a future developer needs is in `CLAUDE.md` (architecture, conventions, every phase) and `README.md` (how to
play, controls, playtest mode, benchmark, CI, handoff).
