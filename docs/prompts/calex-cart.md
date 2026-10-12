# Calex Cart: the original brief

This is the brief Calex Cart was built from with [Claude Code](https://claude.com/claude-code), copied
as written except that other companies' game titles are replaced with a genre description in
[brackets]. The finished game grew beyond it in later rounds of work; see
[games/calex-cart](../../games/calex-cart) for what it became.

---

# Project: Build "Calex Cart", a 3D kart racing game for ages 10–14 (inspired by classic kart racers)

You are building a complete, polished, playable browser kart racing game from scratch for players aged 10–14. The target is roughly 5–6 hours of content: grand prix cups, unlockables, time trials, challenges, and local multiplayer. It will be published on "Ai Kids Games", a kid-friendly game website, and must run well on computers, tablets, and phones. Start in plan mode: read this whole brief, propose a file structure and phase plan, then execute phase by phase. After each phase: run the game, run tests, fix errors, and make a git commit. Keep a CLAUDE.md file updated with architecture notes, commands, and current status.

## Originality (hard requirement)
The game is *inspired by* classic kart racing games but must be fully original. Do not use any [that game's] characters, names, item designs (no shells, no banana peels, no star power-up), track designs, UI layouts, music, or sound effects. Invent original racers, karts, items, tracks, and a world for Calex Cart. All 3D models must be procedural low-poly geometry built in code with a bright, stylized look. All audio, including energetic background music for each track, must be synthesized with the Web Audio API. Do not use external asset files.

## Designing for ages 10–14
- Real skill to master (drifting, item timing, racing lines), but approachable: an optional steering assist and auto-accelerate for younger or newer players.
- Combat is cartoony: getting hit makes karts spin out, bounce, or get covered in goo. Nothing violent or scary.
- Difficulty options: three speed classes (Rookie, Pro, Champion) plus Mirror mode unlocked later. AI difficulty scales with the speed class.
- Mild catch-up help: AI rubber-banding and better items for racers in the back, tuned so races feel close but skill still wins.
- Competitive features stay local only: no online play, chat, accounts, or leaderboards beyond this device.
- No ads, in-app purchases, tracking, external links, or network requests.

## Tech stack
- Vite + TypeScript (strict mode)
- Three.js for 3D rendering
- Custom lightweight kart physics (arcade-style, not a full physics engine) for predictable, fun handling and good performance
- Use `vite-plugin-singlefile` so `npm run build` produces ONE self-contained `dist/index.html`. It must work when opened inside a sandboxed iframe: no external requests, no CDN, no web fonts.
- Persistence via localStorage, wrapped in try/catch and versioned with migrations, with 3 save slots and autosave.
- Vitest for unit tests. Playwright for smoke tests on desktop, tablet, and phone viewports.

## Performance (critical)
- 60 FPS on mid-range laptops with 8 racers on track. On mid-range phones and tablets, a stable 60 FPS where possible and never below 30.
- Adaptive quality: auto-detect weak devices and when FPS drops, reduce draw distance, shadows, particle counts, and resolution. Also offer manual Low / Medium / High settings.
- Merge static track geometry, use instancing for repeated props, use simple baked or fake shadows on mobile, and use object pooling for items and particles. Do not allocate in the hot loop.
- Run physics on a fixed timestep (60Hz) with interpolated rendering.
- Pause when the tab is hidden. Playable within 5 seconds, with a fun loading screen.

## Controls
- **Keyboard:** arrows/WASD to steer and accelerate, Shift or Space to drift, E or Ctrl for items, R to look behind.
- **Gamepad** via the Gamepad API, with remappable buttons.
- **Touch:** steering buttons or tilt (selectable), auto-accelerate on by default, and big drift and item buttons. Landscape only, with a rotate hint. Respect safe-area insets.

## Core racing
- Arcade handling with clear feedback (tire smoke, sparks, kart lean).
- Drift and boost: hold drift while turning to build up spark levels (3 tiers, color-coded). Releasing gives a mini-turbo.
- Jump tricks: press a button off ramps for a small boost on landing.
- Boost pads, glider sections over big gaps, and underwater or low-gravity segments on certain tracks.
- Off-road slows you down. Falling off the track respawns you quickly via a friendly drone with a short delay.
- Every track has 3 laps, a starting countdown with a timed-boost start, and a final-lap music speed-up.
- Position tracking, lap counter, and a minimap.

## Items (all original)
Item boxes on track give a random item, weighted by race position. 12 original items, for example:
- A rolling bumper ball, a homing paper plane, and a goo puddle you drop behind you
- A turbo canister (single or triple), a magnet that pulls you toward the racer ahead, and a short shield bubble
- A cloud that briefly blocks screens of racers ahead, a mini-tornado that spins karts nearby, and a lightning-fast "rocket dash" for last place

Every item has clear visual and audio telegraphing so players can react. Include a counter-play for strong items (e.g. a well-timed shield blocks them).

## Racers and karts
- 12 original racers with distinct personalities and looks (mix of kids, animals, robots, and fantasy characters), in 3 weight classes (light, medium, heavy) that affect speed, acceleration, and handling.
- Kart customization: body, wheels, and glider, each changing stats shown as simple bars (Speed, Acceleration, Handling, Weight, Traction). Paint colors and decals too.
- 6 racers start unlocked. The rest unlock through cups and challenges.

## Tracks
- 16 tracks across 4 cups of 4 tracks each. Each track has a distinct theme and at least one memorable feature:
  - **Sunrise Cup:** beach boardwalk, city rooftops, candy factory, forest canyon
  - **Thunder Cup:** volcano trail, haunted-but-silly theme park, desert ruins, snowy mountain
  - **Galaxy Cup:** moon base (low gravity), underwater dome, sky island gliders, robot factory
  - **Legend Cup:** neon night city, jungle temple, cloud castle, and a final rainbow-style circuit
- Tracks are built from spline data defining the road path, width, banking, elevation, shortcuts, boost pads, item boxes, and props, plus a procedural mesh generator. Adding a track should mean adding data.
- Every track has at least one risky shortcut that rewards skilled players.
- Dev builds only: a simple track editor for laying out spline points and testing laps.

## Modes
- **Grand Prix:** 4-race cups with a points table. Finishing on the podium earns trophies (gold/silver/bronze) and a podium celebration cutscene. Gold in all cups on Pro unlocks Champion. Gold in all cups on Champion unlocks Mirror mode.
- **Time Trial:** solo runs with 3 turbo canisters. Save a ghost of your best lap per track and race against it. Include developer "staff ghost" target times as challenges.
- **Versus:** a single race or custom cup with chosen settings (speed class, items on/off, item set, number of AI racers).
- **Local split-screen:** 2 players on one computer (keyboard + gamepad, or 2 gamepads), in a horizontal or vertical split. Must stay smooth; reduce quality automatically in split-screen.
- **Battle mode:** 4 small arenas where each racer has 3 balloons; popping balloons with items scores points. Playable vs AI or in split-screen.
- **Challenges:** 30+ mission challenges (e.g. "Win a race without using items", "Drift for 10 seconds straight", "Finish first on the volcano trail in Champion") that unlock racers, kart parts, and decals.

## AI
- AI racers follow racing lines with variation, take shortcuts based on difficulty, drift, use items smartly, and avoid hazards.
- AI must feel fair: no obvious cheating speeds and no unfair item sniping.
- Each racer has a personality profile (aggressive, careful, item-focused) for variety.

## UI / UX
- Screens: title, save slot select, main menu, mode select, racer select, kart customization, cup and track select, settings, pause menu, results with points table, trophy podium, collection/unlocks, challenges, and records (best times per track).
- The race HUD shows position, lap, item slot, minimap, speedometer, and drift spark level.
- Juice: speed lines, camera FOV kick on boost, screen-edge glow when an item is incoming, and position-change pop-ups.
- Settings: master, music, and SFX volume, graphics quality, show FPS, steering assist, auto-accelerate, touch steering mode, camera distance, and control remapping.

## Architecture
- Use a system-based design, with race logic decoupled from rendering so it can be unit tested and simulated headlessly.
- All content lives in typed data files: racers, kart parts, items, tracks, cups, challenges, AI profiles.
- Use a seeded RNG for item rolls so races can be replayed for debugging.

## Phases
1. Scaffold the project, set up the single-file build, set up Three.js with adaptive DPR, and add the loading screen.
2. Build kart physics and controls (keyboard, gamepad, touch) plus the camera on a test track.
3. Build the spline track system with the mesh generator, checkpoints, laps, positions, and respawn.
4. Add drifting, mini-turbos, jumps, tricks, boost pads, and gliders.
5. Add AI racers with racing lines and personalities.
6. Add item boxes, all 12 items, and position-weighted rolls.
7. Build all 16 tracks and 4 cups.
8. Add Grand Prix, Time Trial with ghosts, Versus, and Battle mode.
9. Add local split-screen.
10. Add racers, kart customization, unlocks, challenges, and save slots.
11. Add audio, effects, menus, and polish.
12. Do a performance pass: test with 8 racers on the heaviest track on a throttled mobile profile and in split-screen, implement adaptive quality, and fix bottlenecks.
13. Testing and balance: unit tests for physics math, lap and position tracking, item roll weights, points tables, unlock logic, and save migration. Add Playwright tests on desktop, tablet, and phone viewports. Write a headless AI-vs-AI race simulation to verify that every track is completable by the AI, that no racer or kart combo dominates, and that each speed class feels right.

## Ai Kids Games integration
- The final `dist/index.html` will be dropped into `public/games/calex-cart/` on the Ai Kids Games site and run inside a sandboxed iframe (`allow-scripts allow-pointer-lock allow-same-origin`). Verify keyboard, gamepad, touch, and fullscreen all work there.
- In the README, include a ready-to-paste registry entry for the site's `games.ts`:
  - slug: `calex-cart`, title: "Calex Cart"
  - categories: Racing, Action; age guidance: "Ages 10–14"
  - content notes: "Cartoon kart battles with silly spin-outs"
  - controls: keyboard, gamepad, touch; devices: computer, tablet, phone
  - play time: "About 5–6 hours, plus replay"
- Also export an original 16:9 banner and a square thumbnail as SVG files for the site.

## Definition of done
- `npm run dev` runs the game locally. `npm run build` produces a single `dist/index.html` that works when double-clicked and inside a sandboxed iframe.
- All 4 cups, every mode, and split-screen are playable from start to finish, with no soft-locks. Every unlock is achievable.
- 60 FPS on a mid-range laptop with 8 racers, and 30+ FPS on a mid-range phone. Saves survive reloads. All tests pass, with no console errors.
- README.md covers how to play, controls, how to build, and how to add tracks, racers, and items.
- At the end, give me a summary of what was built, performance results, known issues, and suggested next steps.
