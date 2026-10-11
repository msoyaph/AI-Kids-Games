# Calex Cart — Claude notes

Original 3D kart racer for ages 10–14. Vite + TypeScript (strict) + Three.js. Ships as ONE self-contained
`dist/index.html` (vite-plugin-singlefile) that runs inside a sandboxed iframe on the Ai Kids Games site.

## Commands
- `npm run dev` — dev server on :5173 (dev-only track editor available here)
- `npm run build` — typecheck + single-file build → `dist/index.html`
- `npm test` — Vitest unit + headless sim tests
- `npm run test:e2e` — Playwright smoke tests (desktop / tablet / phone) against the built file
- `npm run sim` — headless AI-vs-AI balance report (tsx scripts/simulate.ts)

## Hard rules
- No external assets, fonts, CDNs or network requests. All models are procedural geometry, all audio is Web Audio synthesis.
- Fully original content: no Nintendo characters/items/track designs/UI/music. No shells, banana peels, star power.
- `src/sim/**` must NOT import three.js or touch the DOM — it runs headlessly in tests.
- Sim randomness only via `Rng` (src/core/rng.ts). No `Math.random`/`Date` inside sim.
- No allocation in per-frame hot paths (reuse scratch vectors, pools).
- localStorage access only through `src/save/` (try/catch, versioned, migrations).

## Architecture
- `src/core/` — fixed-step loop (60 Hz + interpolation, pauses on hidden tab), seeded RNG, math helpers.
- `src/render/` — GameRenderer (adaptive DPR, scissor viewports), QualityManager (auto low/med/high + render scale).
- (more sections are added as phases land)

## Status
- Phase 1 ✅ scaffold, single-file build, renderer + adaptive DPR, inline loading screen.
