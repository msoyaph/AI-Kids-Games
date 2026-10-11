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
2. Pending: provided site art plus original TheaBonk and Light Crossing SVGs.
3. Pending: five-game registry, accurate controls/devices, categories and minimum-age filter.
4. Pending: embed permissions and interaction checks.
5. Pre-import safety gate CLEAN: inspected compiled storage operations and original
   storage modules/callers. No colliding keys or global clears. Calex ghost deletion
   enumerates keys but filters to its own slot prefix. Formal audit and site migration pending.
6. Pending: documentation warning for third-party games; remove outdated preview/memory-save claims.
7. Pending: slow-download loading check and Vercel cache headers.
8. Pending: existing tests and desktop/tablet/phone integrated QA, persistence and network checks.
9. Pending: Vercel preview deployment and real-device checklist. Production requires user approval.

Do not edit minified game builds. Any storage ownership defect must halt integration
and be fixed in the original game's source project. Original game folders are read-only
for this task. Old game-sources adaptations are obsolete and will be removed in step 6.
Favorites/recently played currently use legacy keys; migrate to aikg: in step 5.

Existing Sites production remains unchanged. This launch targets Vercel preview first.
