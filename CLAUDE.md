# Ai Kids Games architecture

Static Vite + React + strict TypeScript site. React Router uses browser paths.
Registry: src/data/games.ts. Game builds: public/games/<slug>/index.html.
All art is original local SVG; system fonts; no remote runtime dependencies.
Only favorites/recently played persist. Theme is session-only. Games use memory saves.
The provided game projects are built from isolated copies, leaving originals unchanged.

Commands: npm run dev, npm run build, npm test, npm run test:e2e, npm run add-game.

Status: foundation scaffolded. Games, pages, tests and publication in progress.
