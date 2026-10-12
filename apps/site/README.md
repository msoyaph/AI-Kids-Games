# Ai Kids Games

A responsive catalog of five original first-party browser games: TheaBonk,
Light Crossing, Vanex Defense, Space Sky and Calex Cart. This launch work targets
Vercel preview; production needs approval. The older Sites deployment is unchanged.

## Run locally

```sh
npm ci
npm run dev                 # http://127.0.0.1:5190
npm run build
npm run serve -- 4300       # serve dist like Vercel (headers, ETag, brotli, ranges)
npm test                    # unit tests: registry, search, storage, grid, media budgets, build hashes, deploy guard
npm run test:e2e            # Playwright, desktop/tablet/phone (serves dist on :4190 itself)
npm run capture-previews -- <slug>     # re-record a game's gameplay loop, poster and screenshots
npm run review-screens -- <out-dir> http://127.0.0.1:4300   # every page × 3 sizes × light/dark
npm run lighthouse -- http://127.0.0.1:4300 <out-dir>       # mobile profile: home, details, play
npm run page-weight -- http://127.0.0.1:4300/               # home initial load, excluding videos
```

Playwright uses installed Chrome on macOS, or its managed Chromium elsewhere.
Run build before browser tests. Tests cover desktop, tablet and phone sizes;
real hardware still needs the launch checklist. Build with
`SITE_ORIGIN=http://127.0.0.1:4300` before local Lighthouse so canonical URLs match.

## Catalog and games

Registry: generated from each game's games/<slug>/game.json (npm run manifests at the repo root).
Build validation enforces metadata and local assets.
Home features all games; Browse supports search, categories and minimum-age
filtering. Details list controls, supported devices and age/content guidance.
TheaBonk is computer-only. Calex Cart touch is solo; split-screen needs keyboard
or gamepads. Favorites and recent lists persist locally under aikg: keys, with
migration from previous site keys. Theme stays session-only.

Final game HTML is copied byte-for-byte to public/games/<slug>/index.html.
BUILD_IMPORTS.json records verified hashes and a hash of each game's source. Each game's
source lives in ../../games/<slug>; build and import it with npm run import-game -- <slug> at
the repo root. See ADDING_A_GAME.md before adding a build.

Game saves/settings remain in this browser under distinct namespaces. No ads,
accounts, chat, analytics, uploads, cookies or remote fonts/scripts are included.
The first-party iframe allows scripts, same-origin storage, pointer lock,
fullscreen and gamepad. It does not isolate trusted games from the site;
third-party games need a separate domain. See STORAGE_AUDIT.md.

Each game has real gameplay previews (a 7–8 s muted loop, poster and 4–6 screenshots
captured from the actual build with `npm run capture-previews -- <slug>`), a hand-drawn
SVG cover in the site's shared style with slow idle layers, a transparent title logo and
an Open Graph image, all in `public/media/<slug>/` and `public/og/`. Previews play on
hover or focus (desktop) or when mostly in view (touch), one at a time, never with
reduced motion or Save-Data. Design system: DESIGN_PLAN.md (Nunito, six colors, one
action color).

## Deployment

Production: https://ai-kids-games-fawn.vercel.app (Vercel project real-tours/ai-kids-games).
Vercel: build `npm run build`, output `dist`, Vite preset. vercel.json serves existing
files before the SPA fallback, revalidates unversioned game HTML and caches hashed site
assets. Route shells, robots.txt and the sitemap use SITE_ORIGIN, else the Vercel
production domain. Preview builds are noindex. No secrets are required. Keep hosting
analytics and injected toolbar/telemetry disabled on the game site.

Preview: `vercel deploy --target preview --yes --build-env AIKG_PREVIEW_ONLY=1`. The build
refuses a preview-only deploy that Vercel classifies as production. A production build
(`vercel deploy --prod`) runs only for a release the owner approved: DEPLOYMENT.json's
productionApproval must name the package.json version (scripts/check-deployment.ts).
Bump the version and record a new approval for each release.

Deployment Protection is Standard Protection: previews and per-deployment URLs need Vercel
sign-in, and the production domain is public. For hosted QA on a preview, create a temporary
Protection Bypass for Automation, pass it as `AIKG_VERCEL_BYPASS` with `AIKG_BASE_URL`,
and revoke it afterwards. Never commit it. Rollback steps are in LAUNCH_REPORT.md.
