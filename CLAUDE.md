# Ai Kids Games architecture and launch work

Static Vite + React + strict TypeScript site. React Router uses browser paths.
Registry: src/data/games.ts. Final game builds: public/games/<slug>/index.html.
All assets and fonts are local; no remote runtime dependencies.
Commands: npm run dev, npm run build, npm test, npm run test:e2e, npm run add-game.
Build generates static route metadata/sitemap. Host routing must serve existing game files first.

## Launch checkpoints (2026-10-11)

1. COMPLETE: Imported all five finished HTML builds byte-for-byte. BUILD_IMPORTS.json
   records source paths, sizes, and verified SHA-256 hashes. Import helper now copies
   without inserting policies or changing compiled code. Removed leftover files in
   the five game directories.
2. COMPLETE: copied three provided banner/thumbnail pairs unchanged; created original
   16:9 and square SVG art for TheaBonk (glowing Bonk Ring at dusk) and
   Light Crossing (Driftlight Isle, lighthouse and floating lanterns).
3. COMPLETE: reconciled all README entries with Game; added minAge and Strategy,
   Racing, Learning; finished Light Crossing copy; exact device/control guidance,
   Calex split-screen limitation and Browse player-age filter. Home features all five.
4. COMPLETE implementation: iframe sandbox is exactly allow-scripts allow-same-origin
   allow-pointer-lock, with fullscreen; gamepad permission. Browser interaction
   and save checks run against the complete integration in step 8.
5. COMPLETE: STORAGE_AUDIT.md records every persistent/probe key and scoped deletion.
   No collisions or global clears. Favorites/recent migrated to aikg: with merge,
   corruption handling and retry on quota failure. Clearing lists touches only site keys.
6. Pending: documentation warning for third-party games; remove outdated preview/memory-save claims.
7. Pending: slow-download loading check and Vercel cache headers.
8. Pending: existing tests and desktop/tablet/phone integrated QA, persistence and network checks.
9. Pending: Vercel preview deployment and real-device checklist. Production requires user approval.

Do not edit minified game builds. Any storage ownership defect must halt integration
and be fixed in the original game's source project. Original game folders are read-only
for this task. Old game-sources adaptations are obsolete and will be removed in step 6.
Favorites/recently played use aikg:; legacy migration preserves existing device data.

Existing Sites production remains unchanged. This launch targets Vercel preview first.
