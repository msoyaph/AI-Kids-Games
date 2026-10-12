# Space Sky: the original brief

This is the brief Space Sky was built from with [Claude Code](https://claude.com/claude-code), copied
as written except that other companies' game titles are replaced with a genre description in
[brackets]. The finished game grew beyond it in later rounds of work; see
[games/space-sky](../../games/space-sky) for what it became.

---

# Project: Build "Space Sky", a space exploration adventure game for kids aged 6–10

You are building a complete, polished browser game for kids aged 6–10. Players join the Space Sky Academy as a young cadet. They design and upgrade their own rocket, fly through the solar system and beyond, complete missions, meet friendly aliens, collect samples, and learn real space facts along the way. The target is roughly 5–6 hours of content with a story, missions, challenges, and an ending. It will be published on "Ai Kids Games", a kid-friendly game website, and must run smoothly on tablets, phones, and computers. Start in plan mode: read this whole brief, propose a file structure and phase plan, then execute phase by phase. After each phase: run the game, run tests, fix errors, and make a git commit. Keep a CLAUDE.md file updated with architecture notes, commands, and current status.

## Originality (hard requirement)
The game is *inspired by* kids' space exploration games but must be fully original. Do not copy the names, characters, scenes, UI, or assets of any existing game. Invent the Space Sky Academy, its crew, its alien friends, and its invented worlds. Real solar system planets are fine to use. All art must be procedural and generated in code. All audio, including adventurous background music, must be synthesized with the Web Audio API. Do not use external asset files.

## Designing for ages 6–10
- **Reading:** short, simple sentences (early reader level) with big readable fonts. Icons always accompany text on buttons. Include an optional "Read aloud" toggle using the browser's built-in speech synthesis; it must fail gracefully if unavailable.
- **Gentle challenge, no harsh failure:** flying takes some skill, but mistakes have soft consequences. Bumping an asteroid shakes the rocket and loses a little fuel. Running out of fuel or energy calls a friendly tow-bot that brings you back to the nearest base. You keep everything you collected. There is no game over screen.
- Clear goals: always show the current mission and where to go next.
- Missions should feel achievable for a 6-year-old on Easy and still interesting for a 10-year-old on Normal. Include an Easy/Normal toggle, changeable anytime, which adjusts flight difficulty, fuel use, and hint frequency.
- **Learning:** real space facts are woven in naturally, through mission briefings, the Space Codex, and fun fact pop-ups when visiting real planets. Facts must be scientifically accurate and simply worded. Keep all facts in one data file so a parent or teacher can review them.
- Content is wondrous and fun, never scary: aliens are friendly, space is exciting, and "danger" is mild and cartoonish.
- No ads, in-app purchases, tracking, external links, network requests, or chat.
- Settings (volume, difficulty, read aloud, reset progress) are always available, with reset requiring a confirmation.

## Visual direction
- A bright, bold cartoon style with friendly characters, colorful planets, glowing nebulas, and twinkling stars. HD-crisp at the device pixel ratio (capped at 2).
- Generate all art procedurally (vector shapes, gradients, outlines) and bake it into texture atlases at startup.
- Satisfying polish: engine flames, particle trails, landing dust, glowing collectibles, and celebratory effects when a mission completes.

## Tech stack
- Vite + TypeScript (strict mode)
- PixiJS (WebGL with automatic fallback)
- Use `vite-plugin-singlefile` so `npm run build` produces ONE self-contained `dist/index.html`. It must work when opened inside a sandboxed iframe: no external requests, no CDN, no web fonts.
- Persistence via localStorage, wrapped in try/catch and versioned with migrations, with 3 save slots and autosave.
- Vitest for unit tests. Playwright for smoke tests on tablet, phone, and desktop viewports.

## Performance (tablet and phone first)
- Steady 60 FPS on mid-range tablets and phones, including 3–4 year old iPads and Android tablets.
- Use object pooling and texture atlases, with no allocation in the hot loop. Run game logic on a fixed timestep with interpolated rendering. Pause rendering when the tab is hidden.
- Playable within 3 seconds, with a fun loading animation.
- Landscape-first with a friendly rotate hint. Respect safe-area insets.

## Controls
- **Touch:** an on-screen joystick or tilt-free drag-to-steer, plus big boost and action buttons.
- **Keyboard + mouse:** arrow keys / WASD, space for boost, E for action.
- Gamepad via the Gamepad API.
- Controls are simple enough for a 6-year-old: steering plus one or two buttons at most.

## Core gameplay
- **Space Academy hub:** the home base, with a mission board, rocket hangar, the Space Codex (encyclopedia), the Sticker & Badge wall, and a crew lounge where characters give hints and story.
- **Rocket design:** build your rocket from parts (nose, body, engines, fins, fuel tanks, cargo bay, lights, paint, stickers). Parts have simple stats shown as star ratings (Speed, Fuel, Cargo, Shield). Any combination flies, but better parts help on harder missions. New parts unlock through missions.
- **Flight:** 2D space flight with gentle, kid-friendly physics. Fly between planets on a star map. During flight, collect star-coins and fuel cells, dodge asteroids, ride comet tails for speed boosts, and use gravity slingshots around planets.
- **Landing:** a simple, forgiving landing minigame (slow down and land on the pad). On Easy, auto-assist helps.
- **Planet exploration:** on each planet, control a cute astronaut or rover in a side-scrolling area to explore, collect samples, solve simple puzzles (push blocks, match colors, power up machines), and meet characters.
- **Currency:** star-coins, spent on rocket parts, astronaut outfits, and base decorations.
- **Space Codex:** fills in as you discover planets, moons, aliens, and space objects, with simple facts and pictures.

## Worlds and story (the ~5–6 hour arc)
Structure the game into 5 chapters, each with 4–6 main missions plus optional side missions:
1. **Cadet Training:** learn to fly, land on the Moon, and collect your first samples.
2. **Inner Planets:** Mercury, Venus, and Mars. Repair a rover, explore a canyon, and find hidden ice.
3. **Asteroid Belt and Jupiter:** navigate the asteroid belt, visit Jupiter's moons, and rescue a lost alien explorer who becomes your sidekick.
4. **Outer Planets:** Saturn's rings, Uranus, and Neptune. Help the alien sidekick find clues about their home world.
5. **Beyond the Stars (finale):** travel through a wormhole to the invented alien world of Zephyra, help the aliens restart their star beacon, then a celebration cutscene and credits.

Each real planet shows accurate fun facts (e.g. "A day on Venus is longer than its year!"). Invented alien locations are clearly fictional.

After the credits, players can keep exploring and finish side missions. Show a completion screen with playtime, Codex %, missions done, and badges earned.

## Challenges and rewards
- 30+ badges (e.g. "Visit every planet", "Land perfectly 10 times", "Fill the Codex").
- 3 rotating daily challenges (e.g. "Collect 50 star-coins in the asteroid belt").
- Time-trial races through ring courses around Saturn, with bronze/silver/gold targets that are generous on Easy.
- Collectibles: hidden space stickers on every planet, plus a sticker book to fill.

## UI / UX
- Screens: title, save slot select, astronaut creator (name, suit colors, helmet, face), hub, mission board, star map, hangar/rocket editor, Codex, badges and sticker book, pause menu, settings, and credits.
- The flight HUD shows fuel, shield, star-coins, mission objective, and an arrow pointing to the target.
- Mission briefings use short dialogue with character portraits, and the read-aloud option.
- First-time onboarding tips for each new mechanic, kept short and skippable.

## Architecture
- Use a system-based design, with game logic decoupled from rendering so it can be unit tested.
- All content lives in typed data files: planets, facts, missions, dialogue, rocket parts, badges, collectibles. Adding a planet or mission should mean adding data plus at most one behavior function.
- Use a mission engine built from triggers, objectives, and rewards, defined in data.
- Use a seeded RNG for asteroid fields and daily challenges.

## Phases
1. Scaffold the project, set up the single-file build, set up PixiJS with DPR and resize handling, bake procedural atlases, and add the loading screen.
2. Build flight physics, controls (touch/keyboard/gamepad), fuel, shield, and the tow-bot rescue.
3. Add the star map, travel, landing, and the planet side-scrolling exploration.
4. Build the rocket hangar with parts, stats, and unlocks, plus the economy.
5. Add the mission engine, dialogue, read-aloud, and the hub.
6. Build chapters 1–5 with the finale and credits.
7. Add the Codex, fun facts, badges, daily challenges, races, and the sticker book.
8. Add the astronaut creator, settings, and save slots.
9. Add audio, effects, and onboarding.
10. Testing and pacing: unit tests for flight math, the mission engine, the economy, and save migration, plus Playwright tests on tablet, phone, and desktop viewports. Write a pacing simulation that estimates time per chapter on Easy and Normal, and tune so that a 6-year-old on Easy can finish every mission and the full game takes about 5–6 hours.

## Ai Kids Games integration
- The final `dist/index.html` will be dropped into `public/games/space-sky/` on the Ai Kids Games site and run inside a sandboxed iframe (`allow-scripts allow-pointer-lock allow-same-origin`). Verify touch input, gamepad, read-aloud, and fullscreen work there.
- In the README, include a ready-to-paste registry entry for the site's `games.ts`:
  - slug: `space-sky`, title: "Space Sky"
  - categories: Adventure, Explore, Learning; age guidance: "Ages 6–10"
  - content notes: "Friendly aliens, real space facts, no scary content"
  - controls: touch, keyboard + mouse, gamepad; devices: tablet, phone, computer
  - play time: "About 5–6 hours"
- Also export an original 16:9 banner and a square thumbnail as SVG files for the site.

## Definition of done
- `npm run dev` runs the game locally. `npm run build` produces a single `dist/index.html` that works when double-clicked and inside a sandboxed iframe.
- The game is completable from new game to the finale and credits, with no soft-locks. Every mission is finishable on Easy.
- All space facts are accurate and listed in one reviewable data file.
- 60 FPS on a mid-range tablet. Saves survive reloads. All tests pass, with no console errors.
- README.md covers how to play, controls, how to build, and how to add planets, missions, and facts.
- At the end, give me a summary of what was built, estimated playtime per chapter, known issues, and suggested next steps.
