# Vanex Defense — notes for Claude

Kid-friendly (7+) elemental tower defense. Vite + TypeScript (strict) + PixiJS v8. Ships as ONE self-contained
`dist/index.html` (vite-plugin-singlefile) for the Ai Kids Games site (sandboxed iframe, zero network requests).

## Commands
- `npm run dev` — dev server (port from `$PORT`, default 5173). Dev-only URL flags: `?gallery=1` (atlas viewer).
- `npm run build` — typecheck + single-file build → `dist/index.html`.
- `node scripts/check-dist.mjs` — opens the build via file:// in headless Chromium; fails on console errors or external requests.
- `npm test` — Vitest unit tests (`tests/unit`). `npm run typecheck`.
- `npm run e2e` — Playwright (later phase). `npm run sim` — headless autoplay balance sim (later phase).

## Architecture
- `src/core` — pure utilities: seeded `Rng` (sfc32), math, `Pool` + `swapRemove`.
- `src/data` — ALL content as typed data: `elements.ts` (wheel: Fire→Nature→Water→Fire, Light→Shadow→Earth→Light),
  `towers.ts` (2 basic + 6 element + 15 combo, 4 levels each via `makeLevels`), `enemies.ts`.
- `src/sim` — headless game logic (no DOM / Pixi imports allowed). Fixed 30 Hz step.
- `src/render` — Pixi. `Stage.ts` (WebGL→Canvas fallback, DPR cap 2, resize, `requestRender()` for idle frames —
  must go through rAF or the frame may never present). `quality.ts` (tiers + `FpsGovernor`).
  `atlas/` = procedural Canvas2D art baked once into shelf-packed pages (`packer.ts`, `bake.ts`, `draw*.ts`, `paint.ts`).
  Sprite names: `tb_<tower>_<lv>`, `th_<tower>_<lv>`, `e_<enemy>[_<element>][_f1]`, `p_<projectile>`, `shield_<el>`, `el_<el>`, fx names.
- `src/ui` — DOM/CSS overlay for menus + HUD (system fonts only). `src/dev` — dev-only tools (must be tree-shaken from prod).

## Rules
- Never allocate in the sim/render hot loop: use pools, swap-remove, preallocated arrays.
- No external assets / fonts / network. All art = code; all audio = Web Audio synthesis.
- localStorage access always in try/catch (game must run without storage).
- Kid-friendly copy: short sentences, no violence words ("poof", not "kill", in UI text).

## Status
- Phase 1 (scaffold, single-file build, Pixi + DPR, atlas baking) — done.
