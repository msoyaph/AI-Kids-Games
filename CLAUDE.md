# Ai Kids Games architecture

Static Vite + React + strict TypeScript site. React Router uses browser paths.
Registry: src/data/games.ts. Game builds: public/games/<slug>/index.html.
All art is original local SVG; system fonts; no remote runtime dependencies.
Only favorites/recently played persist. Theme is session-only. Games use memory saves.
The provided game projects are built from isolated copies, leaving originals unchanged.

Commands: npm run dev, npm run build, npm test, npm run test:e2e, npm run add-game.

Routes: /, /games, /category/:name, /game/:slug, /play/:slug, /favorites,
/parents, /about and a wildcard 404. Builds generate per-route static metadata
shells and a sitemap. Static host routing must serve existing game files first.

Game adaptations are preserved in game-sources/. TheaBonk saves to memory and
respects reduced motion for default screen shake. Light Crossing is an island
exploration preview with a touch direction pad; life-sim activities are not wired.
Use scripts/import-game-build.ts after rebuilding a launch game's single HTML.

Validation: 16 Vitest units, desktop/phone Playwright flows, phone movement,
320/390/768/1024/1440 layouts, static metadata, scaffold/overwrite checks,
and local mobile Lighthouse 99 Performance / 100 Accessibility / 100 Best Practices.

Status: all feature, documentation, and QA phases complete. Ready for Sites
source synchronization and owner-private publication; see native deployment
state for the authoritative live version. Adding games: ADDING_A_GAME.md.
