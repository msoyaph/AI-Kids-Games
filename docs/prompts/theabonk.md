# TheaBonk: the original brief

This is the brief TheaBonk was built from with [Claude Code](https://claude.com/claude-code), copied
as written except that other companies' game titles are replaced with a genre description in
[brackets]. The finished game grew beyond it in later rounds of work; see
[games/theabonk](../../games/theabonk) for what it became.

---

## Originality (hard requirement)
The game is called **TheaBonk**. Use this title on the title screen, in the browser tab title, in README.md, in package.json, and anywhere else the game name appears. TheaBonk is *inspired by* [popular wave-survival roguelites] but must be fully original. Do not use their characters, item names, UI layouts, or assets. Invent original characters, weapons, and enemies that fit the TheaBonk name and give the game its own identity. All art must be procedural low-poly geometry built in code. All audio must be synthesized with the Web Audio API. Do not use external asset files.

# Project: Build a complete 3D wave-survival roguelite (inspired by [popular wave-survival roguelites])

You are building a complete, polished, playable browser game from scratch. Work autonomously through the phases below. Start in plan mode: read this whole brief, propose a file structure and phase plan, then execute phase by phase. After each phase: run the game, run tests, fix errors, and make a git commit with a clear message. Keep a CLAUDE.md file updated with architecture notes, commands, and current status.

## Originality (hard requirement)
The game is *inspired by* [popular wave-survival roguelites] but must be fully original. Do not use their names, characters, item names, UI layouts, or assets. Invent an original title (suggest 3 options and pick one), original characters, weapons, and enemies. All art must be procedural low-poly geometry built in code. All audio must be synthesized with the Web Audio API. Do not use external asset files.

## Tech stack
- Vite + TypeScript (strict mode)
- Three.js for 3D rendering
- No backend. The game is fully client-side.
- Use `vite-plugin-singlefile` so `npm run build` produces ONE self-contained `dist/index.html` with all JS, CSS, and audio inlined. It must work when opened inside a sandboxed iframe: no external network requests, no CDN, no fonts from the web.
- Persistence via localStorage, wrapped in try/catch. The game must run fine if storage is unavailable.
- Vitest for unit tests. Playwright for one smoke test (game loads, run starts, no console errors for 30s).

## Core gameplay
- Third-person 3D camera following the player on a procedurally generated low-poly map with hills, ramps, and scattered props.
- Movement: WASD plus mouse camera control, with jump and slide. Momentum-based movement should reward skill (slide-jumping preserves speed).
- Weapons fire automatically. The player only moves and chooses upgrades.
- Enemies spawn in escalating waves around the player, off-screen. There are 6+ enemy types with distinct behaviors: chaser, swarmer, tank, ranged, charger, and splitter.
- Killed enemies drop XP gems. Leveling up pauses the game and offers a choice of 1 of 3 upgrades: new weapon, weapon level-up, or passive item.
- 8+ original weapons, each with 5 upgrade levels, covering melee aura, projectile, orbiting, area burst, chain lightning, boomerang, ground hazard, and homing.
- 10+ passive items, such as damage %, attack speed, area, projectile count, move speed, max HP, regen, XP magnet, luck, and armor.
- Weapon evolutions: a maxed weapon combined with a specific passive evolves into a stronger form.
- Chests dropped by elites grant random upgrades. Breakable shrines grant temporary buffs.
- Bosses appear at 5, 10, and 15 minutes. Surviving 20 minutes, or beating the final boss, wins the run.
- 3 playable original characters with different starting weapons and stats.

## Meta-progression
- Gold earned per run is spent in a main-menu shop on permanent stat upgrades.
- Unlockable characters and weapons via achievements (e.g. "kill 1000 enemies").
- Saved stats include best time, total kills, and runs played.

## UI / UX
- Screens: title, character select, shop, pause menu, level-up picker, game over/victory with run stats, and settings (volume, sensitivity, graphics quality, show FPS).
- The HUD shows HP bar, XP bar, level, timer, kill count, gold, and weapon/item icons. Icons are drawn procedurally with canvas or SVG.
- Damage numbers, hit flash, screen shake (with a toggle), and particle effects.
- Keyboard + mouse, plus gamepad support via the Gamepad API.
- A responsive layout that works from 1280x720 up to 4K.

## Performance (critical)
- Must hold 60 FPS with 500+ enemies and 300+ projectiles on a mid-range laptop.
- Use InstancedMesh for enemies, gems, and projectiles. Use object pooling for everything spawned at runtime. Use a spatial hash grid for collision and targeting. Do not allocate in the hot loop.
- Run game logic on a fixed timestep (e.g. 60Hz) with interpolated rendering.
- Pause the game when the tab or iframe loses focus.
- Provide a debug overlay, toggled with F3, showing FPS, entity counts, and draw calls.

## Architecture
- Use a lightweight ECS-style or system-based design. Keep game logic decoupled from rendering so it can be unit tested.
- All tuning data lives in typed config files: weapons, items, enemies, waves, characters, and evolutions. Adding a new weapon should mean adding a config entry plus one behavior function.
- Use a seeded RNG so runs can be reproduced for debugging.

## Phases
1. Scaffold the project, build pipeline, single-file build, and an empty 3D scene with player movement and camera.
2. Add enemies, spawning, collision, HP, and death.
3. Add weapons, XP, leveling, and the upgrade picker.
4. Add the full weapon/item roster, evolutions, chests, and shrines.
5. Add bosses, waves through 20 minutes, and the win/lose flow.
6. Add menus, characters, meta-progression, and the save system.
7. Add audio, juice, polish, and settings.
8. Do a performance pass (stress-test with 1000 enemies) and fix bottlenecks.
9. Testing: unit tests for damage math, leveling, upgrade selection, and save/load. Add the Playwright smoke test.
10. Do a balance pass. Write a simulated-run script that reports average survival time per character, and tune until a decent player survives roughly 10–15 minutes on a first run.

## Definition of done
- `npm run dev` runs the game locally. `npm run build` produces a single `dist/index.html` that works when double-clicked AND when loaded in a sandboxed iframe.
- All tests pass, and there are no console errors or warnings during a full run.
- A full 20-minute run is playable from start to finish.
- README.md covers how to play, controls, how to run and build, and how to add new content.
- At the end, give me a summary of what was built, known issues, and suggested next steps.
