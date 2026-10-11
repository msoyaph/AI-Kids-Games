# Ai Kids Games

A responsive catalog of five original first-party browser games: TheaBonk,
Light Crossing, Vanex Defense, Space Sky and Calex Cart. This launch work targets
Vercel preview; production needs approval. The older Sites deployment is unchanged.

## Run locally

```sh
npm ci
npm run dev
npm run build
npm run preview
npm test
npm run test:e2e
```

Development: http://127.0.0.1:5190. Production-build preview: http://127.0.0.1:4190.
Playwright uses installed Chrome on macOS, or its managed Chromium elsewhere.
Run build before browser tests. Tests cover desktop, tablet and phone sizes;
real hardware still needs the launch checklist.

## Catalog and games

Registry: src/data/games.ts. Build validation enforces metadata and local assets.
Home features all games; Browse supports search, categories and minimum-age
filtering. Details list controls, supported devices and age/content guidance.
TheaBonk is computer-only. Calex Cart touch is solo; split-screen needs keyboard
or gamepads. Favorites and recent lists persist locally under aikg: keys, with
migration from previous site keys. Theme stays session-only.

Final game HTML is copied byte-for-byte to public/games/<slug>/index.html.
BUILD_IMPORTS.json records verified hashes. Rebuild in the original source
project and import with scripts/import-game-build.ts. There are no adapted
source copies in this repository. See ADDING_A_GAME.md before adding a build.

Game saves/settings remain in this browser under distinct namespaces. No ads,
accounts, chat, analytics, uploads, cookies or remote fonts/scripts are included.
The first-party iframe allows scripts, same-origin storage, pointer lock,
fullscreen and gamepad. It does not isolate trusted games from the site;
third-party games need a separate domain. See STORAGE_AUDIT.md.

Illustrations are original local SVG artwork, not gameplay screenshots. Three
provided art pairs and two new SVG art pairs cover all five games.

## Deployment

Vercel: build `npm run build`, output `dist`, Vite preset. vercel.json serves
existing files before the SPA fallback, revalidates unversioned game HTML and
caches hashed site assets. Static route shells and sitemap use SITE_ORIGIN
when supplied, otherwise the Vercel preview hostname. No secrets are required.
Keep hosting analytics and injected toolbar/telemetry disabled on the game site.

Preview first; do not run a production deployment without owner approval.
See LAUNCH_REPORT.md for final validation and real-device checks.
