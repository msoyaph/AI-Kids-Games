# Vanex Defense: the original brief

This is the brief Vanex Defense was built from with [Claude Code](https://claude.com/claude-code), copied
as written except that other companies' game titles are replaced with a genre description in
[brackets]. The finished game grew beyond it in later rounds of work; see
[games/vanex-defense](../../games/vanex-defense) for what it became.

---

# Project: Build "Vanex Defense", an HD, mobile-friendly tower defense game (inspired by [a classic elemental tower-defense game])

You are building a complete, polished, playable browser tower defense game from scratch. It will be published on "Ai Kids Games", a kid-friendly game website, so it must be fun for ages 7+, easy to learn, and run smoothly on phones and tablets. Start in plan mode: read this whole brief, propose a file structure and phase plan, then execute phase by phase. After each phase: run the game, run tests, fix errors, and make a git commit. Keep a CLAUDE.md file updated with architecture notes, commands, and current status.

## Originality (hard requirement)
The game is *inspired by* [a classic elemental tower-defense game] (elemental towers, combining elements, mazing, wave-based strategy) but must be fully original. Do not use its names, tower names, maps, UI, or assets. Invent an original world and story for Vanex Defense: the crystal kingdom of Vanex must be defended from waves of mischievous creatures. All art must be procedural and generated in code. All audio, including upbeat background music, must be synthesized with the Web Audio API. Do not use external asset files.

## Kid-friendly content
- Enemies are cute, silly creatures (slimes, gremlins, wind-up robots, puffball bats). When defeated they poof into sparkles and coins. No blood, gore, or scary imagery.
- Friendly tutorial guide character with short, simple dialogue.
- No ads, no in-app purchases, no tracking, no external links, no network requests.

## Visual direction: "HD" but fast
- Crisp, high-resolution 2D. Render at the device pixel ratio (capped at 2 for performance) so everything looks sharp on retina phones and tablets.
- Generate all sprites procedurally (vector shapes, gradients, soft shadows, outlines) and bake them into texture atlases at startup. Never redraw vector shapes per frame.
- Polish: glowing projectiles, element-colored particles, smooth tower build and upgrade animations, light bloom on special attacks, gentle screen shake (with a toggle), animated water and grass on maps, and floating damage and coin numbers.
- A bright, vivid color palette with strong readability: each element has a distinct color AND a distinct shape/icon so the game is colorblind friendly.

## Tech stack
- Vite + TypeScript (strict mode)
- PixiJS (WebGL renderer with automatic fallback) for rendering
- Use `vite-plugin-singlefile` so `npm run build` produces ONE self-contained `dist/index.html`. It must work when opened inside a sandboxed iframe: no external requests, no CDN, no web fonts.
- Persistence via localStorage, wrapped in try/catch, versioned with migrations. The game must still run if storage is unavailable.
- Vitest for unit tests. Playwright for smoke tests on desktop and mobile viewports.

## Performance (critical — mobile and tablet first)
- Target a steady 60 FPS on mid-range phones (e.g. a 3–4 year old Android) and iPads, with 200+ enemies and 300+ projectiles on screen.
- Use sprite batching through texture atlases, ParticleContainer for particles, and object pooling for enemies, projectiles, particles, and text. Do not allocate in the hot loop.
- Run game logic on a fixed timestep (e.g. 30Hz) with interpolated rendering. Use a spatial grid for targeting.
- Pathfinding: A* or a flow field on the grid, recomputed only when towers change, never per frame.
- Adaptive quality: auto-detect weak devices and when FPS drops, reduce particles, bloom, and resolution. Also offer manual Low / Medium / High quality settings.
- Pause rendering when the tab is hidden. Keep battery usage modest: cap at 60 FPS and stay idle-friendly in menus.
- Fast startup: playable within 3 seconds on a phone, with a friendly loading screen while atlases bake.

## Mobile and tablet UX
- Touch-first controls: tap to select, tap a grid cell to build, long-press for tower info, pinch to zoom, and drag to pan. Mouse and keyboard work fully on desktop (hotkeys for towers, speed, and pause).
- Show a placement preview before building: a ghost tower, a range circle, and the new enemy path. Block placements that would seal the path completely, with a gentle "That would block the path!" message.
- Large touch targets (minimum 48px), with the UI kept within thumb reach.
- Support landscape and portrait. Landscape is preferred on phones; show a friendly rotate hint, but don't block play. Respect safe-area insets (notches, home bars).
- Game speed: 1x / 2x / 3x. Pause anytime. Add a "Send next wave early" button that grants a bonus.
- The game auto-pauses on blur, rotation, or app switch.

## Core gameplay
- Grid-based maps where players build towers to form a maze and lengthen the enemy path. Some maps also have fixed paths, for variety.
- 6 original elements: Fire, Water, Nature, Light, Shadow, and Earth. Each one has strengths and weaknesses against enemy types.
- Basic towers (arrow, cannon) are available from the start. Players earn "element crystals" at milestone waves and choose which element to unlock, which keeps runs varied.
- Element towers: one tower per element, each with 4 upgrade levels.
- Dual-element towers: combine 2 unlocked elements for 15 combo towers with unique abilities (e.g. Fire+Water = steam slow-cloud, Light+Shadow = eclipse beam).
- Tower abilities include splash damage, slow, chain, poison over time, armor break, stun, and aura buffs.
- Targeting modes per tower: first, last, strongest, and closest.
- Sell towers for a 75% refund.
- 40 waves per map with different enemy types: fast, armored, flying (they ignore the maze), healers, splitters, element-shielded enemies, and boss waves every 10 waves.
- Economy: coins from defeated enemies, a wave-clear bonus, and small interest on saved coins at the end of each wave (teaches saving).
- Lives: enemies that reach the castle cost lives. Losing all lives ends the run, followed by a friendly "Try again!" screen.

## Game content and modes
- **Campaign:** 12 hand-designed maps across 4 themed worlds (Meadow, Desert, Snow, Crystal Caves), each with a short story intro. Earn 1–3 stars per map based on lives remaining. New worlds unlock with stars.
- **Difficulty:** Easy (for younger kids), Normal, and Hard.
- **Endless mode:** unlocked after World 1. Waves scale infinitely, with a local best-wave record.
- **Challenges:** 20+ achievements (e.g. "Win a map with only Water towers", "Build 5 combo towers") with badge rewards.
- **Tutorial:** an interactive first map that teaches building, upgrading, mazing, elements, and combos one step at a time. It can be skipped and replayed.
- **Encyclopedia:** viewable info cards for all towers and enemies, with simple descriptions.

## UI / UX
- Screens: title, world map / level select, pre-level briefing, in-game HUD, pause menu, victory with stars, defeat, encyclopedia, achievements, and settings (music volume, SFX volume, quality, screen shake, game speed default, reset progress with confirmation).
- The HUD shows lives, coins, current wave and total waves, next wave preview (enemy icons), speed buttons, pause, and a send-early button.
- A tower build panel that slides up from the bottom on mobile and shows cost and element icons. Unaffordable towers are greyed out.
- Short, simple text throughout, readable for young kids.

## Architecture
- Use a system-based design, with game logic decoupled from rendering so it can be unit tested and simulated headlessly.
- All content lives in typed data files: towers, combos, enemies, waves, maps, worlds, achievements. Adding a map or tower should mean adding data plus at most one behavior function.
- Maps are defined as compact grid data. Include a simple in-game map editor in dev builds only, for designing levels faster.
- Use a seeded RNG so runs are reproducible for debugging.

## Phases
1. Scaffold the project, set up the single-file build, set up PixiJS with DPR handling and responsive resize, and bake procedural atlases.
2. Build the grid, pathfinding, enemy movement, and lives.
3. Add basic towers, targeting, projectiles, the economy, and the build/sell flow with placement preview.
4. Add elements, element towers, upgrades, and combo towers.
5. Add the wave system, enemy roster, and bosses.
6. Build the campaign maps, worlds, stars, and unlocks, plus endless mode.
7. Add the tutorial, encyclopedia, achievements, and settings.
8. Add audio, particles, and visual polish.
9. Do a mobile performance pass: stress-test with 300 enemies on a throttled mobile profile, implement adaptive quality, and fix bottlenecks.
10. Testing and balance: unit tests for damage/element math, pathfinding (including the block-check), the economy, and save migration. Add Playwright tests on desktop, phone, and tablet viewports. Write a headless auto-play simulation that confirms every campaign map is winnable on each difficulty, and tune until Easy is very forgiving.

## Ai Kids Games integration
- The final `dist/index.html` will be dropped into `public/games/vanex-defense/` on the Ai Kids Games site and run inside a sandboxed iframe (`allow-scripts allow-pointer-lock allow-same-origin`). Verify that it works there, including touch input and fullscreen.
- In the README, include a ready-to-paste registry entry for the site's `games.ts`:
  - slug: `vanex-defense`, title: "Vanex Defense"
  - categories: Strategy, Action; age guidance: "Ages 7+"
  - content notes: "Cartoon creatures poof into sparkles"
  - controls: touch, mouse, keyboard; devices: phone, tablet, computer
  - an estimated play time
- Also export an original 16:9 banner and a square thumbnail as SVG files for the site.

## Definition of done
- `npm run dev` runs the game locally. `npm run build` produces a single `dist/index.html` that works when double-clicked and inside a sandboxed iframe.
- It holds 60 FPS on a mid-range phone in the stress test, with no soft-locks. Every campaign map is winnable, and saves survive reloads.
- All tests pass, with no console errors.
- README.md covers how to play, controls, how to build, and how to add maps and towers.
- At the end, give me a summary of what was built, performance results, known issues, and suggested next steps.
