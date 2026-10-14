<!-- The brief as the owner wrote it, with its follow-up change of direction to 3D. Other companies'
game titles are replaced with a description in [brackets]. The approved plan and its follow-up
decisions are in games/garden-wip/CLAUDE.md. -->

# Project: Build "[GAME NAME]", a kid-friendly lane-defense garden game (inspired by [a famous lane-defense garden game])

Build the ninth game for Ai Kids Games: a lane-defense strategy game where kids plant a garden of friendly plant defenders to protect a picnic from waves of silly, mischievous critters. Ages 7+. Phone (landscape), tablet and computer. About 5–6 hours of adventure, plus endless and challenge modes.

Work in the AI-Kids-Games monorepo. Scaffold with `npm run new-game -- <working-slug>` from the starter template, and follow `docs/CREATE-A-GAME.md`, `AGENTS.md` and the repo rules. Use your own worktree and branch from the latest `main`; other sessions may be active. Never run heavy tests alongside another session's tests, and always respect the quiet check's exit code. Start in plan mode and show me the plan before building. Commit after each phase and keep the game's CLAUDE.md updated so a new session can resume.

## Name
Use a neutral working name and slug. In phase 0, propose 5 short, original, kid-friendly names, checked against app stores and games the way Tuck Pop's were. I'll pick one before the site step. Finalize the slug and storage prefix before any release.

## Originality (hard requirement)
- *Inspired by* the lane-defense genre, but fully original. No names, characters, plant or enemy designs, UI layouts, sounds or text from [that game] or any other game.
- **No zombies,** and nothing undead, brain-related or scary.
- **Avoid that game's signature elements:**
  - a sun-collecting flower or falling-sun currency;
  - pea shooters, a nut wall or a cherry bomb;
  - row-clearing lawnmowers;
  - invaders wearing cones or buckets;
  - a neighbor character who sells things from a car;
  - seed packets on a conveyor belt;
  - a zen garden;
  - its world structure (day, night, pool, fog, roof).

  Design your own resource, plants, invaders, last-line defense and worlds.
- Add [that game's title, its abbreviation and its publisher] to the trademark blocklist. Keep an IP log in the game's CLAUDE.md, with a lookalike review of every plant and invader.
- All art is generated in code, and all audio is synthesized. No asset files.

## Kid-friendly design (hard requirement)
- **Nobody gets hurt.** Plants shoo invaders away; invaders poof into leaves or bubbles and run off home. Plants that get nibbled just wilt and can be replanted.
- **The invaders are silly, never scary:** for example raccoon bandits, snack-sneaking snails, crow kites and sock goblins. They want the picnic snacks, not to hurt anyone.
- **Losing a level** shows a gentle "Try again!" with a helpful hint. Nothing is ever lost.
- **No pressure tactics:**
  - no energy or lives that refill over time, and no daily streaks or red notification dots;
  - no premium plants, purchases, ads, tracking, accounts, chat or network requests.

## Core gameplay
- **The board:** a lane grid (for example 5 lanes × 9 tiles) in front of the picnic blanket. Invaders walk in from the right, lane by lane.
- **Planting:** choose a plant card, then tap a tile. Plants cost an original garden resource that a producer plant generates and that also drifts in over time. Collect it by tapping, or turn on auto-collect in Settings (on by default for younger players).
- **24 original plants,** each inspired by a real plant, covering clear roles:
  - producers and straight shooters;
  - lobbers (which arc over obstacles) and blockers;
  - slowers and area poppers;
  - support plants and lane-switchers;
  - night-only and water-tile plants.

  Each plant has a distinct silhouette, a short "what it does" line, and a recharge time after planting.
- **20 original invader types with readable mechanics:** armored (shells, umbrellas), jumpers, diggers, flyers, swarms, shield carriers, and invaders that steal plants. A friendly mini-boss ends each world, and a silly giant boss ends the adventure.
- **Seed selection:** before each level, choose a set number of plants, with a preview of the invaders in that level.
- **Last-line defense:** an original one-time safety per lane (not lawnmowers). Design your own.
- **Waves:** a flag marks big waves, the final wave gets a clear warning, and there's a 1×/2× speed toggle and pause.

## Modes
- **Adventure:** 50 levels across 5 original worlds, each adding new plants, invaders and one twist. For example: a meadow picnic, a greenhouse with sprinkler tiles, a pumpkin patch at dusk, a desert cactus garden, a cloud garden with gaps and updrafts. Earn 1–3 stars per level; new plants unlock through the adventure.
- **Garden Party:** endless waves with a local best record.
- **Challenges:** 20 original puzzle levels, for example a garden pre-planted with no new planting, a limited plant set, protecting a moving snack cart, or a bowling-style mini-game that's clearly different from that game's version.
- **Daily challenge:** a seeded level that's the same each day, with no streak and no penalty for missing a day.

## Learning
- **Seed Book:** each plant gets a page with a real plant fact (what inspired it, where it grows), simply worded. Keep all facts in one reviewable file.
- **Invader Book:** each critter's silly profile and how to handle it.

## Controls and UX
- **Touch:** tap or drag a card, then a tile; tap to collect; long-press for plant info. Big targets (48 px or more).
- **Keyboard and gamepad:** a grid cursor, number keys or the bumpers to pick plants, A to plant, B to cancel.
- **Mouse:** click and drag.
- **Phones:** landscape, with a rotate hint in portrait. Tablets and desktop scale the board cleanly. Respect safe areas.
- **Settings:** volume, auto-collect, speed default, colorblind patterns on the resource and on invader armor, reduced motion, larger text, read-aloud for tips and books (speech synthesis, failing gracefully).
- Short onboarding the first time each plant or mechanic appears.

## Look and sound
- **Art:** a bright, chunky, friendly 2D style, with cute idle animations for every plant and invader, a gentle squash when planting, leaf-poof effects, and day and dusk lighting per world.
- **Flash safety:** nothing flashes more than 3 times per second. Use a central effects module and a unit test, like Agentmon's.
- **Audio:** upbeat synthesized music per world, building with the waves, and satisfying sounds for planting, collecting and shooing. Mix with a limiter.

## Tech and the game contract
Follow the starter template and the site's contract:
- Vite + TypeScript (strict mode), and PixiJS.
- **Build:** one self-contained `dist/index.html` under 2 MB. It must work from file:// and inside the site's sandboxed iframe, with no network requests.
- **Storage:** every key uses the game's prefix, saves are versioned with migrations and stay under 100 KB, and a full storage area is handled gracefully.
- **Data:** plants, invaders, waves, levels, worlds and facts live in typed data files, so adding content means adding data. One tuning file holds all balance values. Use a seeded RNG.
- **Hooks:** a read-only test hook and a preview capture route (a big wave defended, a boss, a planting moment, a world showcase).
- **Manifest:** a `game.json` with ages "7+", categories Strategy and Casual, genre keywords (lane defense, garden strategy, plant defense, kids strategy game; no franchise names), controls, devices and play time.
- **Performance:** 60 FPS on mid-range phones with a full board and a big wave.

## Lessons from Agentmon (build these in from the start)
- **Tests never depend on frame rate.** Use press-based input helpers rather than held keys, and taps fired inside the page for timing-sensitive actions.
- **Quick taps always count:** a tap between frames is latched and used, never lost on slow devices.
- **Slow renderers:** detect software rendering and draw at 1×, with a frame-rate governor for slow devices.
- **CI** runs browser tests with one worker.
- **Shortcuts:** test shortcuts (like `?quickstart`) never overwrite a real save.
- **Saving:** save when the page is hidden or closed.
- **Touch controls** never appear over the title screen or menus.

## Testing and balance
- **Unit tests:** targeting, damage and slow math, resource generation, wave spawning, plant recharge, invader mechanics, stars, the daily seed, save migration and the storage budget.
- **Bot simulation:** a bot plays every Adventure and Challenge level with sensible plant choices.
  - Every level is beatable with the plants available at that point.
  - A casual bot can 1-star every Adventure level on its first or second try.
  - No single plant is required, and no plant dominates.
  - Report the win rates and pacing per world, targeting about 5–6 hours for the Adventure.
- **Browser tests** (Playwright, Chromium and WebKit; phone landscape, tablet and desktop):
  - planting by touch and by mouse, keyboard and gamepad play;
  - collecting resources, and a full level won;
  - save and reload;
  - file:// and the sandboxed iframe;
  - no console errors and no network requests.
- **Visual review:** screenshot every world, plant and invader, the books and the menus on phone and desktop. Review them critically, including the lookalike check.

## Add it to Ai Kids Games
- Once I've picked the name, import the build, run the storage audit, capture previews, cover, logo and Open Graph image in the site's style, and check the site grid with the new game count.
- Open a pull request, get CI green, and give me the preview link. **Stop before production;** I'll play it first and approve the release myself.

## Definition of done
- All modes are complete, every level is beatable, and all tests pass locally and in CI.
- The build is under 2 MB at 60 FPS on the throttled phone profile, and the game appears on the site preview.
- At the end, give me:
  - screenshots of each world, a sheet of every plant and invader, and the Seed Book;
  - bot balance and pacing results, the build size and the save size;
  - the IP log, the preview link and known issues.

---

*The owner's follow-up message:*

Change of direction: build this game in 3D with Three.js instead of 2D PixiJS. Everything else in the brief stays the same.

## 3D approach: a "2.5D diorama"
- Three.js (pinned version) on WebGL 2. Show a friendly message on devices without WebGL 2.
- **Camera:** a 3D garden diorama seen from a fixed, slightly tilted three-quarter camera, with gentle camera moves only for wave intros, bosses and victories (reduced motion turns them off). Gameplay stays on the flat lane grid: the game logic is 2D and fully separate from rendering, so the rules, balance and bot tests don't change.
- **Models:** stylized 3D plants and critters built in code (rounded low-poly shapes, soft materials, rim light), each with idle, action, nibbled and happy animations. Every silhouette must read clearly from the tilted camera.
- **Lighting:** a look per world (meadow day, greenhouse glow, dusk pumpkin patch, desert sun, cloud garden), with shadows and a gentle bloom on higher quality.
- **Performance tricks:** instancing for projectiles, particles, grass and resource pickups; pooling, with no allocation in the hot loop.
- **Interface:** the HUD, plant cards and menus stay as a crisp 2D overlay on top of the 3D scene.
- **Tapping:** taps pick tiles by raycasting onto the board, with generous hit areas so tiles are easy to hit at an angle. Add a unit test that every tile is reachable by tap at every supported screen size.

## Quality and performance
- **Quality tiers:** Low, Medium and High, with an adaptive governor like the other 3D games. Software renderers start on Low at 1×.
  - **Low:** blob shadows, no post effects.
  - **Medium:** soft shadows.
  - **High:** shadow maps and bloom.
- **Performance target:** 60 FPS on mid-range phones with a full board (45 plants), 40 invaders and 150 projectiles on screen. Report draw calls and memory per tier.
- **Build budget:** up to 2.5 MB instead of 2 MB.

## Style check first
Before building the full art set, make one style frame: a lane board with 3 plants and 3 invaders in the first world. Show it on a phone and on desktop at each quality tier. Wait for my approval of the look, then continue autonomously.
