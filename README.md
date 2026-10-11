# TheaBonk

*Bonk the Gloom. Survive until dawn.*

TheaBonk is a 3D low-poly survivors-like roguelite that runs in the browser. Thea the
Bonkwright and her friends hold a moonlit meadow against the Gloom from dusk until dawn.
Weapons fire on their own. Your job is to move well, slide, jump, and build a combo that
survives 20 minutes and three bosses.

It plays on computers (keyboard and mouse, or a gamepad) and on **phones and tablets** with
on-screen glass touch controls.

Every model is procedural low-poly geometry built in code, and every sound and note of
music is synthesized with the Web Audio API. There are no asset files.
`npm run build` produces **one self-contained `dist/index.html`** that you can double-click,
host anywhere, or embed in a sandboxed iframe.

---

## How to play

- **Move** with WASD and look with the mouse. Weapons attack automatically.
- **Pick up gems** that fallen Gloom drop. Each level-up pauses the game and offers
  3 boons (4 with luck): a new weapon, a weapon level, a new item, or an item level.
- **Evolve weapons.** Max a weapon (level 5), own its matching item, and an
  **Evolution** card appears. Chests from gold-glowing elites also evolve eligible
  weapons first.
- **Bonk shrines** (walk into them or land on them) for temporary blessings: Fury,
  Haste, Warding, Gathering, Wisdom and Plenty.
- **Use momentum.** Slide to burst ahead. Slides gain speed downhill, and jumping out of a
  slide keeps your speed. Hit the wooden kicker ramps fast to launch into the air.
  Ramps lead up onto the mesas, where some shrines sit.
- **Read the telegraphs.** Ramhorns glow red before they charge, so step aside. Jump over
  red shockwave rings and leave glowing circles.
- **Bosses** arrive at **5:00** (Grumblecap), **10:00** (Clockjaw) and **15:00** (the
  Gloam Regent). Defeat the Regent, or survive until **20:00** (dawn), to win.
- **Spend gold between runs** in the Workshop on permanent upgrades. Achievements unlock
  new heroes (Pip, Brindle) and weapons (Frost Fan, Wisp Bees).

### Controls

| Action | Keyboard / mouse | Gamepad |
| --- | --- | --- |
| Move | WASD / arrow keys | Left stick / d-pad |
| Look | Mouse (click to lock), or hold a button and drag; Q / E | Right stick |
| Jump | Space | A / Cross |
| Slide | Shift or C (hold) | B / Circle, or either trigger |
| Pause | Esc or P | Start / Select |
| Choose upgrade | 1–4, click, or arrow keys + Enter | D-pad + A |
| Zoom camera | Mouse wheel | — |
| Debug overlay (FPS, entities, draw calls) | F3 | — |

The game pauses automatically when the tab or iframe loses focus. Inside an iframe, the
camera defaults to hold-to-drag, because pointer lock is often sandboxed away. You can
change this in Settings → Camera control.

### Touch (phones and tablets)

Phones and tablets get frosted-glass touch controls automatically (landscape; turning the
device upright pauses with a "turn sideways" hint).

| Action | Touch |
| --- | --- |
| Move | Put your thumb down on the left half: a stick appears under it. Push to the edge for full speed. |
| Look | Drag on the right half. The camera also swings in behind Thea by itself (Settings → Touch controls → "Camera follows me"). |
| Jump / Slide | The big **JUMP** and **SLIDE** buttons, bottom right. Slide is hold, or tap-to-toggle (Settings → Slide: tap to toggle). Jumping out of a slide keeps your speed. |
| Pause | The **II** button in the top-right corner |
| Choose upgrade | Tap a card. Reroll, Skip and Banish are buttons. |

**Settings → Touch controls** has size (Small, Medium, Large), how see-through they are,
a left-handed layout, a stick that stays put instead of following the thumb, camera
drag speed, vibration (Android; iPhone and iPad browsers don't vibrate), high-contrast
controls, and **Edit layout** (drag the buttons anywhere that doesn't cover the timer, the
boss bar or the health bar; resize them; Reset to default).

Touchscreen laptops and iPads with a keyboard switch automatically: touch the screen and the
controls appear; use a key, the mouse or a gamepad and they hide again.

### Heroes

| Hero | Start weapon | Personality | Unlock |
| --- | --- | --- | --- |
| **Thea**, the Bonkwright | Bonk Ring (melee aura) | +10% damage, balanced | Available from the start |
| **Pip**, the Thistle Scout | Thistle Darts (projectiles) | Fast, slightly fragile, super slides | Defeat 1,000 Gloom in total |
| **Brindle**, the Lantern Sage | Firefly Lanterns (orbit) | Tanky: HP, armor, regen, area | Survive 10 minutes in one run |

### Arsenal

| Weapon | Kind | Evolves with | Into |
| --- | --- | --- | --- |
| Bonk Ring | Melee aura | Kettle Lid | Quake Crown |
| Thistle Darts | Projectile | Echo Shell | Thornstorm |
| Firefly Lanterns | Orbiting | Hourglass Sand | Everglow Lanterns |
| Thunder Drum | Area burst | Brimmed Hat | Skyquake Drum |
| Zap Jar | Chain lightning | Quickspring | Storm Bottle |
| Wobble Disc | Boomerang | Gale Feather | Comet Disc |
| Ember Seeds | Ground hazard | Whetstone | Wildfire Grove |
| Wisp Bees *(unlock)* | Homing | Clover Button | Queen's Swarm |
| Frost Fan *(unlock)* | Spread projectile + slow | Mossy Charm | Glacier Bloom |

Items: Whetstone, Quickspring, Brimmed Hat, Echo Shell, Puddle Boots, Hearty Stew, Mossy
Charm, Lodestone, Clover Button, Kettle Lid, Hourglass Sand, Gale Feather, and Scholar's
Bookmark.

The Gloom: Gloomling (chaser), Gnatlet (swarmer), Boulderback (tank), Spitcap (ranged),
Ramhorn (charger), Blobbin (splits into Blobbits), and Fusewick (exploder; its blast
hurts other Gloom too). Elites glow gold and carry treasure.

---

## Running and building

Requires Node 20+.

```bash
npm install
```

```bash
npm run dev
```

Dev server at http://localhost:5173. URL options:

- `?seed=123` reproduces a run's map and rolls.
- `?stress=1000` is a stress test that keeps 1000 enemies and about 400 projectiles alive with the player invulnerable. Press F3 to see the numbers.

```bash
npm run build
```

Typechecks, then writes the single file `dist/index.html` (about 770 KB, no external
requests). It works when double-clicked (`file://`) and inside
`<iframe sandbox="allow-scripts">`. When storage is unavailable, progress lasts for the
session only, and the title screen says so.

```bash
npm test
```

Runs the Vitest unit tests: damage math, leveling, upgrade selection, evolutions, chests,
shrines, bosses, save/load, movement physics, and determinism.

```bash
npx playwright install chromium
```

```bash
npm run test:e2e
```

Playwright smoke tests against the production build: a 30 s run with no console errors or
warnings, menus, a sandboxed iframe, and `file://`.

```bash
npm run simulate -- 16 0.7
```

Balance simulation: a bot plays full first runs for every hero (seeds, bot skill 0–1) and
reports survival times.

```bash
npm run bench -- 1000 20
```

Headless simulation benchmark (enemies, seconds).

---

## Ai Kids Games registry notes

TheaBonk now supports phones and tablets with touch. Changes for the site's entry
(`src/data/games.ts`, slug `theabonk`):

- `supportedDevices`: `["Computer", "Tablet", "Phone"]`
- `controls.types`: add `"Touch"` → `["Keyboard", "Mouse", "Gamepad", "Touch"]`
- `controls.howToPlay`: add *"On phones and tablets, put your thumb down on the left to
  move, drag on the right to look, and tap JUMP and SLIDE. Tap a card to pick an upgrade."*
- `quickStart`: first step → *"Move Thea with WASD, the arrow keys, a gamepad stick, or your
  left thumb on a phone or tablet."*; third step → *"When you level up, pick a new power
  with 1–4, a click, or a tap."*
- `contentNotes`: remove *"A keyboard and mouse or gamepad is required."* — keep the rest.
- Remove the "works best on a computer" notice for TheaBonk.
- Phones play in landscape. A modern phone or tablet runs it at Auto quality (the Tablet
  tier); slower devices step down automatically.

## Adding content

All tuning lives in typed config files under `src/config/`. The simulation in `src/sim/`
is pure TypeScript with no DOM or three.js, so everything can be unit-tested and simulated
headlessly.

### A new weapon

1. Add a `WeaponConfig` entry to `src/config/weapons.ts`: `id`, `name`, `description`, a
   `behavior` (`aura`, `projectile`, `orbit`, `burst`, `chain`, `boomerang`, `hazard`,
   `homing`), `base` stats, 4 `levels` of deltas, a `visual` (color + projectile model),
   and an `sfx` name. Optionally set `unlock` to an achievement id.
2. Give it an icon by adding a glyph function to `GLYPHS` in `src/ui/icons.ts`.
3. Optionally add an evolution in `src/config/passives.ts` (`EVOLUTIONS`) and an evolved
   `WeaponConfig` with `evolved: true` and `levels: []`.

That's it. If you need a genuinely new *kind* of weapon, write one function
`(world, weaponInstance) => void` in `src/sim/weapons/` and register it in `BEHAVIORS`
(`src/sim/weapons/index.ts`). New projectile looks go in `projectileGeometry`
(`src/render/models.ts`) and `VISUALS` (`src/sim/weapons/common.ts`).

### A new item, enemy, wave, hero, shop upgrade or achievement

| Content | Where |
| --- | --- |
| Passive item | `PASSIVES` in `src/config/passives.ts` (stat deltas per level) plus an icon glyph |
| Enemy | `ENEMIES` in `src/config/enemies.ts` (reuse a behavior) plus a model case in `enemyGeometry` |
| Waves / events | `WAVES` (spawn segments) and `WAVE_EVENTS` (rings, swarms, hordes, elites, bosses) in `src/config/waves.ts` |
| Boss pattern | A function in `src/sim/bosses.ts`, selected by `bossPattern` |
| Hero | `CHARACTERS` in `src/config/characters.ts` plus a model in `characterGeometry` and a portrait in `portraitUrl` |
| Shop upgrade | `SHOP` in `src/config/meta.ts` |
| Achievement | `ACHIEVEMENTS` in `src/config/achievements.ts` (check, progress, reward) |
| Global tuning | `src/config/balance.ts` (XP curve, enemy scaling, drops, movement) |

After changing numbers, run `npm run simulate` to check survival times stay in the
intended 10–15 minute band for a first run.

---

## Tech notes

- Vite + TypeScript (strict) + three.js, bundled into one file with `vite-plugin-singlefile`.
- Fixed 60 Hz simulation with interpolated rendering. A seeded RNG makes runs reproducible.
- Structure-of-arrays entity pools, a spatial-hash grid, instanced meshes for enemies,
  projectiles, gems, particles and props, and no allocation in the hot loops. That's about
  50 draw calls and roughly 0.3 ms of simulation per tick with 1000 enemies.
- Save data is versioned and sanitized. localStorage is always wrapped and falls back to memory.

See `CLAUDE.md` for architecture details.
