# Calex Cart

A bright, original 3D kart racer for ages 10–14 that runs in the browser on computers, tablets and phones.
Drift for sparks, glide over canyons, skid across ice, dodge paper planes and goo puddles, and collect trophies
across **20 tracks in 5 cups** with **13 racers**. There's Time Trial with your ghost and staff ghosts, Versus,
balloon Battle and Coin Rush, a 6-lesson Driving School, instant replays and 2-player split-screen.

Everything is made in code: the karts, racers, tracks and scenery are procedural low-poly geometry, and all
music and sound effects are synthesized live with the Web Audio API. The game ships as **one self-contained
`index.html`** with no external files, fonts, CDNs or network requests.

---

## How to play

Race 3 laps and finish first. Item pods (the floating gems) give you a random item. Racers near the back get
more helpful items.

- **Drift:** hold Drift while turning. Sparks charge from blue to orange to pink. Let go for a mini-turbo; pink is the biggest.
- **Rocket start:** press accelerate when the countdown shows **1**. If you press too early, you sputter.
- **Tricks:** press Drift just as you leave a ramp, and you get a boost when you land.
- **Gliders** open automatically off blue glider ramps. Steer while you glide.
- **Shortcuts:** every track has a risky one. Try finding them in Time Trial.
- **Ice** (Frost Cup, Frostpeak Pass shortcuts) is slippery: brake early, drift sooner, and enjoy faster sparks.
- **Falling off** is fine: a friendly drone carries you back.
- **Blocking:** hold an item behind your kart to block things thrown at you. A Bubble Shield blocks one hit.
  You can make a Paper Plane miss by hopping, doing a trick or boosting just as it swoops.

### Controls

| Action | Keyboard | Gamepad (standard) | Touch |
|---|---|---|---|
| Steer | ← → or A D | Left stick / D-pad | Glass joystick: put your left thumb down anywhere on the left and slide (or ◀ ▶ buttons, or tilt) |
| Accelerate | ↑ or W | A or RT | Automatic (GO button in countdown) |
| Brake / reverse | ↓ or S | B or LT | BRAKE |
| Drift / hop / trick | Shift or Space | RB or X | DRIFT |
| Use item | E or Ctrl | LB or Y | ITEM (swipe down to throw back) |
| Throw item backwards | hold ↓ / S while using | hold stick down | swipe down on ITEM |
| Look behind | R | Left-stick click | 👀 |
| Pause | Esc or P | Start | II |

Menus work with arrows/WASD + Enter/Esc, Tab / Shift+Tab, the D-pad + A/B, mouse, or touch. Q and E (or LB and
RB) switch tabs. Before your first race on a keyboard, gamepad or touch screen, a **controls card** shows what
every button does; open it again from **Settings → Controls**, where you can also remap keyboard and gamepad
buttons.

**2-player split-screen:**
- 2 gamepads: one each.
- 1 gamepad: Player 1 on the keyboard, Player 2 on the gamepad.
- No gamepads: both share the keyboard. P1 uses W A S D + Left-Shift/Space (drift) + E (item); P2 uses
  the arrows + Right-Shift (drift) + Enter (item).

### Modes
- **Grand Prix:** 4-race cups (points 15-12-10-8-6-4-2-1), with gold, silver and bronze trophies and a podium.
  Rookie and Pro are open from the start. Gold in every one of the first four cups on Pro unlocks **Champion**,
  and gold in all four on Champion unlocks **Mirror**. Galaxy Cup unlocks with a trophy in both Sunrise and
  Thunder, Legend Cup with a trophy in Galaxy, and the winter **Frost Cup** (Shiver Lake, Crystal Cavern, Lantern
  Village, Avalanche Peak) with any Legend Cup trophy. Frost trophies are a bonus and never needed for other unlocks.
- **Time Trial:** solo with 3 Turbo Cans. Race your best-run ghost and the staff ghost. Beat staff times for ⭐.
  Staff times sit between the Pro AI and a near-perfect run.
- **Versus:** a single race or a custom 4-race cup, with your own speed, items on/off, item set, AI count and laps.
- **Battle:** 5 arenas and two games. In **Balloons**, each racer starts with 3 balloons and every pop scores a
  point; nobody is eliminated. In **Coin Rush** (2 minutes), grab the most coins; when an item hits you, you drop 3.
- **Driving School:** six short lessons (steering gates, drift sparks, rocket starts, items and dodging,
  shortcuts, glider rings) on two practice courses, with bronze, silver and gold medals. Gold in all six unlocks
  the Learner kart. New players are invited from the main menu.
- **Instant replay:** after any race, press **Replay 🎬** to watch it again with auto, chase, trackside and
  overhead cameras. You can play/pause, jump ±10 s, change speed and follow any racer.
- **Challenges:** 40 missions. They unlock the other racers and every kart part, paint, decal and arena.

### Settings
- **Sound:** master, music and SFX volume.
- **Graphics:** quality (Auto/Low/Medium/High), FPS counter, screen shake, **HUD size** (100/125/150 %),
  **Reduce effects** (no camera shake, speed blur or lines, hit pauses or flashing; on by default when the device
  asks for reduced motion), split-screen orientation, and **Test performance** (see below).
- **Gameplay:** steering assist (**Auto** = Light on touch screens and Off on keyboard/gamepad; **Light** keeps you
  on the road; **Full** follows the racing line with you and stops most falls), auto-accelerate, camera distance,
  rumble & vibration (gamepad rumble; short buzzes on Android phones).
- **📱 Touch:** steering (**Joystick**, the default, or **Buttons** or **Tilt**), joystick **Floating** (it appears
  under your thumb) or **Fixed**, size (Small/Medium/Large), opacity, **left-handed** (swaps the sides), **high
  contrast**, rumble & vibration, and **Edit layout**: drag any control to move it and its yellow corner to resize it.
  Controls stay inside the screen's safe areas, off the HUD and apart from each other. Layouts are saved separately
  for landscape and tablet portrait. A live preview shows the controls over a bright and a dark track.
- **Controls:** the controls card, and keyboard/gamepad remapping.

Accessibility: drift-spark tiers show as 1–3 chevrons plus a word (MINI / SUPER / ULTRA), on the HUD and on the
touch joystick's ring, and incoming items show an icon plus a word (PLANE!, BALL!…), so neither depends on colour.
Every menu works with a keyboard alone, a gamepad alone, or touch alone. Every touch control keeps a touch target of
at least 48 px, even at Small size. With Reduce effects on, the controls' ripple, trail and pulse animations stop.

**Touch controller** (design: [docs/touch/design.md](docs/touch/design.md)): every control follows its own finger, so
steering, drifting and using an item at once always works. The joystick keeps its finger even when the thumb slides
off its side of the screen. Glass is "fake" (layered gradients, no blur, free) at every quality; real frosted blur is
used only on High, and only while it costs no frames. If frame times rise, it crossfades back to fake glass.
Tablets can race upright; phones race sideways.

Saves: 3 save slots stored in this browser only (`localStorage`). They autosave and use a versioned format with
migrations. There are no accounts, online play, chat, ads, purchases, tracking or external links.

### Storage keys (all under the `calexcart.` prefix)

| Key | What | Notes |
|---|---|---|
| `calexcart.slot.1` … `.3` | save slots | format v3 (adds Driving School medals; Frost Cup migration) |
| `calexcart.settings` | settings | v3 (assist level, reduce effects, rumble, HUD size, controls card seen, playtest flag, touch controller: steering mode, joystick, size, opacity, hands, contrast, edited layouts) |
| `calexcart.lastSlot` | last used slot | unchanged |
| `calexcart.ghost.<slot>.<track>` | best-run ghost per track | now a compact `G2` format (~15.6 KB for a 4-minute run); older ghosts are converted at startup |
| `calexcart.playtest` | **new**: playtest log | only when playtest mode is on; rolling buffer of about 100 KB |
| `calexcart.__probe` | storage check | written and removed straight away |

Calex Cart never reads, writes or deletes keys outside its prefix. **Worst case** (a ghost on all 20 tracks in all
3 slots, a full playtest log and settings) is **about 1.08 MB**, under the 1.5 MB budget. If the browser's storage is
full, the game frees space from its own playtest log first, then shows a friendly message and keeps playing. A save
is never half-written.

---

## Building

Requirements: Node 20+ (tested on Node 24).

```bash
npm install
npm run dev          # http://localhost:5173 (dev server)
npm run build        # typecheck + single-file build → dist/index.html, fails if it reaches 2 MB
npm test             # Vitest unit + headless simulation tests (~3 min)
npm run test:e2e     # build, then Playwright: Chromium + WebKit × desktop / tablet / phone
npm run validate     # track validator: geometry + AI races on every track (add --all-classes for 6 runs each)
npm run sim          # headless AI-vs-AI balance report → sim-report/balance.md
npm run calibrate-staff   # re-time the staff ghosts (after any physics / AI / track change)
npm run bench        # performance test on the built game (needs `npx vite preview --port 4173`)
npm run bench-controls    # what the touch controls cost: none / fake glass / real blur × tiers × phone & tablet
```

WebKit for the browser tests: `npx playwright install webkit` (once). All balance numbers live in one file,
**`src/tuning/balance.ts`**: catch-up, item odds, AI skill and pace, assist strengths, staff paces and stat mapping.

`dist/index.html` runs when double-clicked (file://) and inside a sandboxed iframe.

Developer tools (dev server only, stripped from production builds):
- `/?editor`: top-down **track editor**. Drag control points, double-click to insert, Delete to remove,
  edit elevation/width/bank, test a lap, export points.
- `/?track=<id>&autodrive` (also `&mirror`, `&class=pro`, `&ai=7`, `&nointro`) jumps into a race and lets the AI drive.
  `/?arena=<id>` does the same for battle.
- `npx tsx scripts/validateTracks.ts [ids…]` checks geometry and runs AI races; it writes top-down SVG maps to `sim-report/tracks/`.
- `node scripts/perf.mjs <track> [--cpu 4] [--mobile] [--split]` measures frame stats on the built game (needs `npx vite preview --port 4173`).

---

## Testing on real devices

### Serve the build to a phone or tablet
1. `npm run build`
2. `npx vite preview --host --port 4173`. Vite prints a **Network** address such as `http://192.168.1.20:4173/`.
3. Open that address in Safari or Chrome on the iPad, iPhone or Android device (same Wi-Fi). Add `?playtest=1`
   and/or `?bench=1` as below. To check memory on an iPhone or iPad, connect it to the Mac, enable
   **Settings → Safari → Advanced → Web Inspector**, then open **Safari (Mac) → Develop → <device>**. The Timelines
   tab shows memory, and the performance test also prints its numbers to the console.

### Playtest mode (anonymous numbers from real players)
- Turn it on with **`?playtest=1`** in the address, or tap the **Settings** title 5 times. That reveals the
  🧪 **Playtest** tab, where you switch *Playtest recording* on or off. While it's on, a small
  **"Playtest recording on"** badge shows in the corner.
- For every race it records track, class, mode, racer/kart, input type, assists, finish, lap times, falls, drift
  time, mini-turbos by tier, items, hits, shortcuts and rocket starts. **No names, nothing personal, never sent
  anywhere.** It's stored in `calexcart.playtest`, a rolling buffer of about 100 KB that drops the oldest races first.
- **Export playtest data** downloads a `.json` file. Inside a sandboxed iframe, where downloads are blocked, it
  shows a box with a **Copy** button instead; paste that into a `.json` file. **Clear playtest data** deletes the log.
- Put the exported files in one folder and run `npm run analyze-playtests -- <folder>`. It compares them with
  simulator baselines and **prints suggested** `src/tuning/balance.ts` edits (also in `sim-report/playtests.md`).
  It never changes the game.

### Performance test
- **Settings → Graphics → Test performance (60 s)**, or open the game with **`?bench=1`**
  (`&seconds=30`, `&quality=low|medium|high|auto`). A scripted 8-kart race on the heaviest track (Neon Nightway)
  runs by itself, then a card shows average FPS, 1 % low, frame times, draw calls, triangles, quality tier and
  render scale per second, GPU, and memory.
- Rough targets: **average ≥ 55 FPS and 1 % low ≥ 40** at the tier Auto picks. Memory: JS heap < 120 MB and 3D data < 60 MB.
- From the Mac: `npm run bench -- --quality medium --profile tablet` (a 1024×768, DPR 2 tablet with a 4× CPU slowdown)
  or `--profile phone`. It needs `npx vite preview --port 4173` running.

---

## Continuous integration (GitHub Actions)

Calex Cart lives in the Ai Kids Games monorepo. Its checks run in the root workflow
(`.github/workflows/ci.yml`, job **Calex Cart**) on GitHub's standard Ubuntu runners for every pull request and
every push to `main` that touches `games/calex-cart/` or shared files: typecheck, single-file build with the 2 MB
size check, unit and simulation tests, the track validator, and the Chromium + WebKit browser tests in the game's
low-quality test mode (`CALEX_TESTMODE=1`, software WebGL).

Full-quality runs on a real GPU and the Low/Medium/High benchmark are run by hand on your own computer: see
`docs/BENCHMARKS.md` at the repo root. Never connect a self-hosted runner to this public repository.

After changing the game, run `npm run import-game -- calex-cart` at the repo root so the website gets the new build;
CI fails if the game's source changes without a re-import.

---

## Adding content

Everything the game shows is typed data in `src/data/` (`types.ts` is the contract).

### Tracks
See **[docs/track-authoring.md](docs/track-authoring.md)**. In short:
1. Create `src/data/tracks/<cup>/<name>.ts` and describe the loop with the layout DSL
   (`straight()`, `left()`, `right()` with elevation/width/bank and named marks).
2. Add features at mark positions: boost pads, item rows, ramps (`trick` or `glider` + `gaps`),
   `zones` (`water`, `lowgrav`), hazards, edges (`wall`/`drop`/`open`) and at least one shortcut.
3. Give it a palette, sky/backdrop, scatter rules and landmark props (recipes in `src/data/props/<cup>.ts`).
4. List it in the cup's `index.ts` and in `src/data/cups.ts`. Set `music` to a song id from `src/data/songs.ts`
   (add a new procedural song there if you like).
5. Run `npx tsx scripts/validateTracks.ts <id>` until it's clean, then drive it with `/?track=<id>`.

### Racers
Add an entry to `src/data/racers.ts`. Each racer has a name, bio, weight class (`light`/`medium`/`heavy`),
colours, AI personality, default kart and a **model recipe** (a list of primitive parts: sphere, box, capsule,
cone and so on, with position, scale, rotation and colour). If `unlocked: false`, add a challenge in
`src/data/challenges.ts` that rewards it. A unit test checks that every locked item can be unlocked.

### Kart parts, paints and decals
Add bodies, wheels and gliders to `src/data/parts.ts` with small stat modifiers (±1–2 bars) and a model recipe.
Paints are two colours. Decals use one of the procedural patterns in `src/render/decals.ts`.

### Items
1. Add the id to `ItemId` in `src/data/types.ts` and an entry in `src/data/items.ts`, with a description,
   counter-play, uses, and roll weights per position bucket `[1st, front, middle, back, last]`.
2. Add its behaviour in `src/sim/items/itemSystem.ts` (`useItem` and, if it is a thrown or placed entity,
   `stepEntity`/`collideEntities`).
3. Add a model recipe in `src/data/itemModels.ts`, an SVG icon in `src/ui/icons.ts`, a sound in
   `src/audio/engine.ts` (`itemUseSound`), and AI rules in `src/sim/ai/itemBrain.ts`.
4. Add a test in `tests/sim/items.test.ts`.

---

## Putting it on Ai Kids Games

1. `npm run build`. Output: one file, `dist/index.html`, **about 1.25 MB** (the build fails at 2 MB).
2. Copy `dist/index.html` to `public/games/calex-cart/index.html`. Copy `site/banner.svg` and
   `site/thumbnail.svg` next to it.
3. **Recapture the site previews and cover art after this update.** The game now has a winter Frost Cup, a new
   racer (Yuki), new lighting and materials and a new HUD, so older screenshots, previews and the banner/thumbnail
   art no longer match. `node scripts/capture.mjs --out shots --tracks avalanche-peak,lantern-village,neon-nightway`
   (with `npx vite preview --port 4173` running) makes clean 1280×720 race shots to start from.
4. Embed it in a sandboxed iframe. The `allow` list makes fullscreen, gamepads and tilt steering work inside the frame:

```html
<iframe src="/games/calex-cart/index.html"
        sandbox="allow-scripts allow-pointer-lock allow-same-origin"
        allow="fullscreen; gamepad; autoplay; accelerometer; gyroscope"
        allowfullscreen
        style="width:100%;aspect-ratio:16/9;border:0"></iframe>
```

Without `allow="fullscreen"`, the in-game Fullscreen button hides itself. Without `allow-same-origin`, saves
fall back to memory and are kept only for that visit.

### Registry entry for `games.ts`

```ts
{
  slug: 'calex-cart',
  title: 'Calex Cart',
  description: 'Drift, boost and glide through 20 bright tracks, from sunny beaches to a snowy village at night, in an original 3D kart racer. Win Grand Prix trophies in five cups, chase Time Trial ghosts, earn medals in Driving School, pop balloons or grab coins in Battle, or race a friend in split-screen.',
  categories: ['Racing', 'Action'],
  ageGuidance: 'Ages 10–14',
  contentNotes: 'Cartoon kart battles with silly spin-outs',
  controls: ['keyboard', 'gamepad', 'touch'],
  devices: ['computer', 'tablet', 'phone'],
  playTime: 'About 7–8 hours, plus replay',
  path: '/games/calex-cart/index.html',
  banner: '/games/calex-cart/banner.svg',
  thumbnail: '/games/calex-cart/thumbnail.svg',
},
```

---

## Project layout

```
src/core      fixed-step loop (60 Hz + interpolation), seeded RNG, math
src/sim       headless race simulation: physics, tracks, laps, items, AI, battle, ghosts (no three.js)
src/render    three.js: renderer + adaptive quality, track/kart/prop meshes, particles, cameras, menus scene
src/audio     Web Audio synth, procedural music sequencer, sound effects
src/game      App, race sessions, Grand Prix / Time Trial helpers, progression, challenges
src/ui        DOM menus, HUD, minimap, icons, styles
src/input     keyboard / gamepad / touch / tilt, remappable bindings
src/save      versioned save slots + settings
src/data      all content: racers, parts, items, tracks, cups, arenas, challenges, songs, props
src/dev       dev-only track editor
tests/unit    Vitest unit tests        tests/sim  headless simulation tests        tests/e2e  Playwright
scripts       validator, balance simulator, perf harness, probes
site          banner.svg + thumbnail.svg
```

## Originality

Calex Cart is inspired by the kart-racing genre but is entirely original. Its racers, items, tracks, UI, music and
sounds were all created for this project in code, and no third-party characters, designs or assets are used.
