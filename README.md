# Calex Cart

A bright, original 3D kart racer for ages 10–14 that runs in the browser on computers, tablets and phones.
Drift for sparks, glide over canyons, dodge paper planes and goo puddles, and collect trophies across
**16 tracks in 4 cups**, with Time Trial ghosts, Versus, balloon Battle and 2-player split-screen.

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
- **Falling off** is fine: a friendly drone carries you back.
- **Blocking:** hold an item behind your kart to block things thrown at you. A Bubble Shield blocks one hit.
  You can make a Paper Plane miss by hopping, doing a trick or boosting just as it swoops.

### Controls

| Action | Keyboard | Gamepad (standard) | Touch |
|---|---|---|---|
| Steer | ← → or A D | Left stick / D-pad | Left steering pad (or tilt) |
| Accelerate | ↑ or W | A or RT | Automatic (GO button in countdown) |
| Brake / reverse | ↓ or S | B or LT | BRAKE |
| Drift / hop / trick | Shift or Space | RB or X | DRIFT |
| Use item | E or Ctrl | LB or Y | ITEM (swipe down to throw back) |
| Throw item backwards | hold ↓ / S while using | hold stick down | swipe down on ITEM |
| Look behind | R | Left-stick click | 👀 |
| Pause | Esc or P | Start | II |

Menus work with arrows/WASD + Enter/Esc, the D-pad + A/B, mouse, or touch. Q and E (or LB and RB) switch tabs.
You can remap keyboard and gamepad buttons in **Settings → Controls**.

**2-player split-screen:**
- 2 gamepads: one each.
- 1 gamepad: Player 1 on the keyboard, Player 2 on the gamepad.
- No gamepads: both share the keyboard. P1 uses W A S D + Left-Shift/Space (drift) + E (item); P2 uses
  the arrows + Right-Shift (drift) + Enter (item).

### Modes
- **Grand Prix:** 4-race cups (points 15-12-10-8-6-4-2-1), with gold, silver and bronze trophies and a podium.
  Rookie and Pro are open from the start. Gold in every cup on Pro unlocks **Champion**, and gold in every cup
  on Champion unlocks **Mirror**. Galaxy Cup unlocks with a trophy in both Sunrise and Thunder; Legend Cup
  unlocks with a trophy in Galaxy.
- **Time Trial:** solo with 3 Turbo Cans. Race your best-run ghost and the staff ghost. Beat staff times for ⭐.
- **Versus:** a single race or a custom 4-race cup, with your own speed, items on/off, item set, AI count and laps.
- **Battle:** 4 arenas, each racer starts with 3 balloons, and every pop scores a point. Nobody is eliminated.
- **Challenges:** 34 missions. They unlock the other 6 racers and every kart part, paint, decal and arena.

### Settings
Master, music and SFX volume. Graphics (Auto/Low/Medium/High), FPS counter, screen shake, split-screen
orientation. Steering assist, auto-accelerate, touch steering (buttons/tilt), camera distance. Control remapping.

Saves: 3 save slots stored in this browser only (`localStorage`). They autosave and use a versioned format with
migrations. There are no accounts, online play, chat, ads, purchases, tracking or external links.

---

## Building

Requirements: Node 20+ (tested on Node 24).

```bash
npm install
npm run dev          # http://localhost:5173 (dev server)
npm run build        # typecheck + single-file build → dist/index.html
npm test             # Vitest unit + headless simulation tests
npm run test:e2e     # build, then Playwright smoke tests (desktop / tablet / phone)
npm run sim          # headless AI-vs-AI balance report → sim-report/balance.md
```

`dist/index.html` runs when double-clicked (file://) and inside a sandboxed iframe.

Developer tools (dev server only, stripped from production builds):
- `/?editor`: top-down **track editor**. Drag control points, double-click to insert, Delete to remove,
  edit elevation/width/bank, test a lap, export points.
- `/?track=<id>&autodrive` (also `&mirror`, `&class=pro`, `&ai=7`, `&nointro`) jumps into a race and lets the AI drive.
  `/?arena=<id>` does the same for battle.
- `npx tsx scripts/validateTracks.ts [ids…]` checks geometry and runs AI races; it writes top-down SVG maps to `sim-report/tracks/`.
- `node scripts/perf.mjs <track> [--cpu 4] [--mobile] [--split]` measures frame stats on the built game (needs `npx vite preview --port 4173`).

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

1. `npm run build`
2. Copy `dist/index.html` to `public/games/calex-cart/index.html`. Copy `site/banner.svg` and
   `site/thumbnail.svg` next to it.
3. Embed it in a sandboxed iframe. The `allow` list makes fullscreen, gamepads and tilt steering work inside the frame:

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
  description: 'Drift, boost and glide through 16 bright tracks in an original 3D kart racer. Win Grand Prix trophies, chase Time Trial ghosts, pop balloons in Battle, or race a friend in split-screen.',
  categories: ['Racing', 'Action'],
  ageGuidance: 'Ages 10–14',
  contentNotes: 'Cartoon kart battles with silly spin-outs',
  controls: ['keyboard', 'gamepad', 'touch'],
  devices: ['computer', 'tablet', 'phone'],
  playTime: 'About 5–6 hours, plus replay',
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
