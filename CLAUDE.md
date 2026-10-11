# Space Sky — notes for Claude

A space exploration adventure game for kids aged 6–10, built for the "Ai Kids Games" site.
Vite + TypeScript (strict) + PixiJS 8, shipped as ONE self-contained `dist/index.html`.

## Commands
- `npm run dev` — dev server (Vite). In the desktop app use `.claude/launch.json` → `spacesky-dev` (port 5391).
- `npm run build` — typecheck + single-file build → `dist/index.html`.
- `npm test` — Vitest unit tests (`tests/unit`).
- `npm run test:e2e` — Playwright smoke tests on desktop/tablet/phone viewports (build first; serves dist on :4392).
- `npm run pacing` — pacing simulation (estimated minutes per chapter on Easy/Normal).
- `npm run svgs` — export the site banner + thumbnail SVGs to `site-assets/`.
- URL flags: `?fps` shows an FPS meter, `?debug` exposes `window.__spacesky` test hooks.

## Architecture
- **Hybrid rendering**: Pixi draws the world (flight, map, landing, platformer, hub backdrop). A DOM layer (`#ui`)
  draws menus, HUD, dialogue, touch controls. `#ui` is laid out in *logical units* (≥960×720) and scaled with a CSS
  transform; Pixi's stage is scaled the same way (`app/stage.ts`). Safe-area insets are exposed as CSS vars `--safe-*`.
- **Fixed timestep** 60 Hz logic + interpolated render (`app/loop.ts`). Rendering stops when the tab is hidden.
- **Scenes** (`src/scenes/*`) extend `app/Scene.ts`; each owns `root` (Pixi Container) and `ui` (DOM). Created fresh
  per visit via `game.go(name, params)`; registered in `main.ts`.
- **Services** live on `S` (`app/services.ts`), filled during boot.
- **Pure logic** in `src/systems/*` (no Pixi/DOM) so it can be unit tested.
- **Content** is typed data in `src/data/*` (parts, bodies, characters, stickers, facts, missions, levels...).
  All space facts live in `src/data/facts.ts` for parent/teacher review.
- **Art** is procedural: Canvas2D vector drawing (`gfx/canvas.ts`, `gfx/art/*`) baked into atlases (`gfx/atlas.ts`)
  at bake resolution = min(2, dpr × scale). Planets/rocket are baked lazily as single textures (`gfx/textures.ts`).
  UI icons are inline SVG strings (`ui/icons.ts`). No external assets, no web fonts.

## Status
- [x] Phase 1: scaffold, single-file build, Pixi + DPR/resize, atlases, loading screen, title.
- [x] Phase 2: flight physics (systems/flight.ts), sector generator (systems/flightWorld.ts), input (input/input.ts + input/touch.ts), FlightScene + HUD, Tuggy tow.
- [ ] Phase 3: star map, travel, landing, exploration.
- [ ] Phase 4: hangar, parts, economy.
- [ ] Phase 5: mission engine, dialogue, read-aloud, hub.
- [ ] Phase 6: chapters 1–5, finale, credits.
- [ ] Phase 7: codex, facts, badges, dailies, races, sticker book.
- [ ] Phase 8: astronaut creator, settings, save slots.
- [ ] Phase 9: audio, effects, onboarding.
- [ ] Phase 10: tests, pacing.

## Gotchas
- Headless Chromium renders WebGL in software; e2e timings are much slower than real devices.
- `npm audit` flags `braces` via `vite-plugin-singlefile → micromatch` — build-time only, not shipped.
- Port 5173 is used by another project on this machine; use 5391/4391/4392.
