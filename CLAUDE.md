# Ai Kids Games architecture and launch work

Static Vite + React + strict TypeScript site. React Router uses browser paths.
Registry: src/data/games.ts. Final game builds: public/games/<slug>/index.html.
All assets and fonts are local; no remote runtime dependencies.
Commands: npm run dev, npm run build, npm test, npm run test:e2e, npm run add-game.
Build generates static route metadata/sitemap. Host routing must serve existing game files first.

## Hard rules

- Never change a game build. public/games/*/index.html must match BUILD_IMPORTS.json.
  Original game folders are read-only. Storage defects are fixed in the game's source.
- Keep favorites, recently played (aikg: keys, legacy migration), the age filter,
  iframe sandbox/permissions, storage keys, cache headers and kid-safety rules:
  no tracking, no accounts, no requests to other origins.
- Before every commit, check `git log` for commits this session did not make; if
  any appear, stop and tell the owner. Don't rewrite history.
- Stop and ask the owner only if something would change a game build, break saves,
  favorites or recently played, need another origin, or make the definition of
  done impossible. Otherwise decide, note it here, and continue.

## Redesign and production launch (in progress, started 2026-10-11)

Brief: visual/UX redesign, gameplay previews, new cover art, privacy and launch
readiness, then production on Vercel. Approved design: DESIGN_PLAN.md.

Owner decisions:
1. Domain: the Vercel production domain for now.
2. Real loading progress approved; site CSP may use `connect-src 'self'` only.
3. Replace all five games' art. Each game's cover, logo and capture route live in
   their own files so they can be redone (Vanex Defense is being restyled for
   ages 10–14; Space Sky is moving to 3D; both will be recaptured later).
4. No "Tap to start". Lighthouse Performance 90+ applies to home and details only.
   The play page is exempt from Performance because it boots a 1 MB game inside
   the page (long main-thread tasks are the game's, not the site's); its
   Accessibility, Best Practices and SEO must still be 90+.
5. Balanced grid must work for any count; screenshot-test 1, 4, 6, 7 and 12 games
   with temporary mock entries.

Codex commits reviewed (10:24–10:32): 9197120 and 2c433df only recorded preview
deployments and Sites publishes in docs. c301c6d removed all-caps eyebrows and
intros on Browse/Favorites/Parents (kept: fits the plan) and hid Light Crossing's
card category/status via a slug check as a "selected" cosmetic edit, with no
defect recorded; reverted in 5538700 so every card is uniform. The ChatGPT Sites
publish (.openai/hosting.json) is left untouched.

Progress (one commit per step):
1. COMPLETE: design plan approved (DESIGN_PLAN.md).
2. COMPLETE: gameplay capture. `npm run capture-previews -- <slug>` (scripts/capture-
   previews.ts, scripts/capture/{lib,encode,types}.ts, one route per game in
   scripts/capture/<slug>.ts) records the real games headed in full Chromium with the
   Metal flags (headless gives no canvas frames / ~18 fps tab capture), from the game
   canvas at 60 fps (HUD-free). Capture-time shims only: keep the page "focused"
   (games pause on blur) and esbuild's __name helper. Frame arrival times map moments
   to video time; covered-window stalls are detected and retried. Outputs in
   public/media/<slug>/ and src/data/media.json; raw takes in git-ignored captures/.
   Loops are 7.2–8 s, all under 760 KB. Vanex (restyle) and Space Sky (3D) routes
   are written to be rerun on their new builds; Vanex's source project already has
   renamed towers, so routes must target the imported dist, not the source.
3. COMPLETE: new art per game in public/media/<slug>/: hand-drawn 1600×900 cover.svg
   (shared flat style, real characters/colors from captures and game sources, no text,
   top 22% + side 6% background-only) plus cover-<motion>.svg idle layers listed in
   Game.coverLayers; logo.svg outlined from Nunito Black by scripts/art/logos.ts
   (opentype.js 1.3.4: 2.0 mis-parses Nunito's WOFF); public/og/<slug>.jpg and
   site.jpg by scripts/art/og.ts. Old public/art removed; registry drops thumbnail/
   banner, adds coverLayers and quickStart; src/lib/media.ts derives all media paths.
4. COMPLETE: design system (src/styles.css tokens: Paper/Surface/Ink/Slate/Mist/Go,
   light+dark via prefers-color-scheme and data-theme; self-hosted Nunito in
   src/assets/fonts with OFL, preloaded by vite.config.ts), new Layout/Icon/Mark,
   favicons (scripts/art/icons.ts), manifest, CSP connect-src 'self'.
5. COMPLETE: src/lib/previews.ts (one controller: hover/focus on desktop, most-in-view
   on touch, one at a time, lazy sources, never with reduced motion/Save-Data, error →
   still), Preview/Cover/GameCard/GameGrid (src/lib/grid.ts balanced rows)/Hero/Lightbox.
   Pitfall fixed: effects must depend on primitives (mediaFor() returns new objects).
6. COMPLETE: pages Home (hero, single filtered grid, Play again, category rows at 12+),
   Search, Details (facts, gallery/lightbox, quickStart + All controls), Play (streamed
   real progress from build-sizes.json, then iframe; sandbox unchanged), Favorites,
   For parents, Privacy, About, 404. Route shells add canonical/robots/sitemap.
7. COMPLETE: launch metadata. Route shells (scripts/generate-route-shells.ts) write
   per-page titles/descriptions, absolute canonical URLs (SITE_ORIGIN, else
   VERCEL_PROJECT_PRODUCTION_URL), og/twitter images, robots.txt + sitemap.xml (details
   pages, not /play; play pages stay indexable for Lighthouse SEO); previews get noindex.
   Favicons/manifest from scripts/art/icons.ts. Playwright now serves dist with
   scripts/serve-dist.ts (Vercel-like: headers, ETag, brotli, ranges, route shells);
   vite preview served the root shell for /game/<slug>.
8. COMPLETE: visual review of every page × desktop/tablet/phone × light/dark
   (scripts/review-screens.ts) with fixes: TheaBonk loop now opens on the horde,
   For parents table gains covers/no-wrap ages, prose heading spacing, game strip on
   About/404, save button label-in-name, play page <main>, filter updates use the
   functional setSearchParams (fixed a tablet race). Local (Vercel-like) Lighthouse
   mobile: home 95/100/100/100, details 97/100/100/100, play 64 (exempt)/98→fixed/100/100.
   Home initial load ≈180 KB (scripts/page-weight.ts). Full Playwright: 80 passed + fixes
   re-run green; unit tests green. After screenshots: docs/screenshots/after.
9. TODO: preview deploy, hosted suite, production, smoke test, report.

## Earlier launch checkpoints (2026-10-11, all complete)

1. Imported all five finished HTML builds byte-for-byte. BUILD_IMPORTS.json records
   source paths, sizes and SHA-256 hashes; scripts/import-game-build.ts copies unchanged.
2. Original art: three provided pairs plus two drawn pairs (being replaced, see above).
3. Registry reconciled: minAge, Strategy/Racing/Learning, exact device/control
   guidance, Calex split-screen limitation, player-age filter.
4. Iframe sandbox is exactly allow-scripts allow-same-origin allow-pointer-lock,
   with allow="fullscreen; gamepad".
5. STORAGE_AUDIT.md: no collisions or global clears; site owns aikg:favorites and
   aikg:recent; clearing lists touches only site keys.
6. ADDING_A_GAME.md forbids third-party same-origin games (needs a separate domain).
7. Loading screen stays visible during a throttled download. Unhashed HTML/art
   revalidate; hashed Vite assets are immutable for a year.
8. 20 unit tests and 47 applicable Playwright cases (desktop/tablet/phone) passed:
   20-second clean runs, saves survive reloads, audio unlocks, cross-game storage
   preserved, pointer lock, fullscreen, simulated gamepads, touch controls.
9. Vercel preview deployed (real-tours/ai-kids-games). The build's production guard
   (scripts/check-deployment.ts) requires AIKG_ALLOW_PRODUCTION=approved.
   Later cosmetic edits by Codex were published to a refreshed preview and to the
   older two-game ChatGPT Sites version (version 3).
