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
6. COMPLETE: ADDING_A_GAME.md explicitly forbids third-party same-origin embedding
   and requires a separate domain. README/parent/About copy reflect persistent
   finished games. Removed obsolete adapted source copies and fixed art metadata.
7. COMPLETE: throttled download (40 KiB/s, 200 ms latency) kept loading screen
   visible until iframe load; Playwright passed. Unhashed HTML/art revalidate;
   hashed Vite assets cache immutably for one year. CDN uses deployment-specific
   static caching; verify deployed ETag/headers in step 9.
8. COMPLETE: 20 unit tests and 47 applicable Playwright cases pass across desktop,
   tablet and phone (16 intentional device-specific skips). All five games run
   error-free for 20 seconds, persist saves/settings on iframe reload, unlock audio
   on the first gesture and preserve other games' saves and catalog lists. Desktop
   pointer lock/fullscreen and simulated gamepads pass. Actual touch events cover
   Vanex towers, Light/Space movement and Calex driving/controls. Space/Calex need
   landscape on touch devices; registry guidance now says so. Native Safari and
   physical controller checks remain on the real-device checklist.
9. COMPLETE: Vercel preview READY at
   https://ai-kids-games-m7zdjkpiq-real-tours.vercel.app. All 13 original hosted browser
   checks pass; hosted game hashes, revalidation/304 and immutable asset cache
   verified. Production was not published: a guard stopped Vercel's first-attempt
   production classification; the second attempt is preview. Temporary QA access
   revoked; normal Vercel sign-in retained. Real iPad/Safari/phone checklist is in
   LAUNCH_REPORT.md. Production remains gated on explicit owner approval.

Do not edit minified game builds. Any storage ownership defect must halt integration
and be fixed in the original game's source project. Original game folders are read-only
for this task. The obsolete game-sources adaptations have been removed.
Favorites/recently played use aikg:; legacy migration preserves existing device data.

The five-game release targets Vercel preview first. Existing Sites only received
the later requested homepage cosmetic update; its two-game catalog is retained.

## Homepage review changes

Removed the selected welcome strip, hero eyebrow badge and Featured/Recently
Played/New Games/category subtitles. Kept headings, game content and controls.
Added a small top gap after removing the strip. Apply the same cosmetic changes
to the existing two-game Sites version and the five-game Vercel preview; the
five-game production launch still requires owner approval.

Homepage review verification: 15 catalog browser checks pass across desktop,
tablet and phone. All selected phrases are absent at 855 and 390 pixel widths
in both versions, without overflow or page errors. Sites version 2 is published
at the existing URL; five-game Vercel production is still not approved.
