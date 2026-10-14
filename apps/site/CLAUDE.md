# Ai Kids Games architecture and launch work

Static Vite + React + strict TypeScript site. React Router uses browser paths.
Registry: generated from games/<slug>/game.json (npm run manifests at the monorepo root) into
src/data/games.generated.ts; types in src/data/games.ts. Builds: public/games/<slug>/index.html,
only via npm run import-game -- <slug> at the root. Monorepo notes: ../../CLAUDE.md.
All assets and fonts are local; no remote runtime dependencies.
Commands: npm run dev, npm run build, npm test, npm run test:e2e (root: new-game, import-game).
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

## Redesign and production launch (release 2.0.0, live 2026-10-11)

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
9. COMPLETE: release 2.0.0 is live at https://ai-kids-games-fawn.vercel.app (commit 783c343,
   dpl_Ae5DWvTurreEjNvT3kkqeRdw8dVp). Approval recorded in DEPLOYMENT.json; guard allows
   only that version. Hosted suite on protected preview pxkrj9q0w (temporary bypass,
   revoked) and logged-out production suite: 84 passed / 0 failed each. Deployment
   Protection switched to Standard (previews protected, production public). Production
   Lighthouse mobile: home 99/100/100/100, details 98/100/100/100, play 45 (exempt)/100/100/100.
   Pitfall: in zsh never name a loop variable `path` (it rewrites PATH).

## Tuck Pop, the seventh game (release 2.4.0)

Listed from `games/tuck-pop/game.json`. Its genres are Puzzle and Casual (new categories; the filter
chips and /category routes come from the games). Art lives in `public/media/tuck-pop/`: a generated
cover, float and twinkle layers, a logo with per-letter colors, and the OG image. Previews come from
`scripts/capture/tuck-pop.ts`, which uses the game's own `?scene=` capture route, crops to the
board, and needs the game to draw every frame in capture mode. Tests now count 7 games (age 6: LC,
Space Sky, Tuck Pop).

**Preview tie-break:** on touch, the preview nearest the screen's middle plays, by row first and
then by column. Before this, two cards in the same row tied and the first in the page always won;
the tablet test now accepts any card from the centred row.

## Home opens on the featured games (owner, 2026-10-13; release 2.4.1, live 2026-10-13)

- The home h1 ("Ai Kids Games: The games kids love. …") is screen-reader and search only (`sr-only`).
- The "Watch the trailer" button and its dialog are gone. The trailer lives on About only.
- The hero carousel opens on TheaBonk (`HERO_LEAD` in `src/pages/Home.tsx`). The other featured
  games follow in catalog order.
- **"Add to Home"** sits beside Play in the hero, on phones and tablets only (coarse pointer). It
  never shows once the site is opened from the Home Screen.
  - The code is `src/lib/install.ts`, imported in main.tsx so Chromium's early
    `beforeinstallprompt` is kept, plus `src/components/AddToHome.tsx`.
  - Chrome, Edge and Samsung Internet open their own install prompt.
  - iPhone and iPad show the Safari steps, with the Play page's note that Home Screen saves are
    separate from Safari's. Other browsers show the browser-menu steps.
  - Nothing is stored or sent. The existing manifest is install-ready.
- **Fix:** the featured thumbnails made the hero wider than the phone (366 px), which pushed it past
  the right gutter and turned a 375 px page sideways. Now the hero column is `minmax(0,1fr)`, and
  on phones the thumbnails share the row at 48–56 px, wrapping only below about 330 px. The phone
  test checks 320, 375 and 390 px.

## SEO and AI search (owner brief 2026-10-13; next release 2.5.0, needs the owner's approval)

The audit is in docs/seo/AUDIT.md, and the owner's manual steps are in docs/seo/LAUNCH-CHECKLIST.md.

**Owner decisions:**
- **Brand:** "AI Kids Games", matching the owner's new logo (docs/brand). It applies to the site,
  manifests, llms.txt, README and public docs. Exceptions:
  - game sources and game package.json files are build inputs, so Cliff Valley and Space Sky still
    say "Ai Kids Games" in-game until their next release;
  - CLAUDE.md logs, docs/prompts and marketing/ are historical;
  - the trailer still shows the old logo and an aikids.games end card.
- **Organization data:** sameAs lists GitHub, YouTube and Facebook. The owner's LinkedIn goes on
  `founder` (a person's profile doesn't identify an organization).
- **Domain:** aikids.games is unregistered, so nothing links to it. The live address is
  `PUBLIC_ORIGIN` in src/data/site.ts plus `SITE_ORIGIN` in Vercel Production; switch both when
  the domain is connected.

**How it works:**
- **Real HTML:**
  - `generate-route-shells.ts` renders every route with `src/entry-server.tsx` (the same
    `src/routes.tsx` and components as the app) into its static HTML.
  - `main.tsx` loads the current page's chunk before the first render, so `createRoot` swaps the
    prebuilt HTML for identical markup, with no loading screen and no layout shift
    (tests/e2e/seo.spec.ts).
  - **Pitfall:** never touch `window`, `document`, `matchMedia` or storage while rendering; guard
    `useState` initializers with `typeof`.
- **Real 404s:** the catch-all rewrite is gone from vercel.json, and `serve-dist.ts` does the same.
  - **Pitfall:** a new route must be added to `sitePaths()` or `unlistedPaths()` in src/seo/meta.ts,
    or it 404s on reload.
- **One source for page metadata:** `pageMeta(path)` in src/seo/meta.ts gives the title,
  description (50–160 characters, tested) and share image to both the build and `usePageMeta()`
  (called in Layout and Play).
- **Structured data:** src/seo/schema.ts, typed with schema-dts 2.0.0 (pinned). It covers:
  - Organization and WebSite;
  - ItemList, CollectionPage and BreadcrumbList;
  - VideoGame, FAQPage, Article, and a VideoObject for the trailer.

  tests/seo.test.ts checks the properties Google requires and that every file exists.
- **Content:**
  - src/data/faq.ts: its device and age answers come from the manifests.
  - src/data/guides.ts holds the metadata; src/data/guide-bodies.ts holds the words. They are
    separate so the main bundle doesn't carry the guides.
  - lib/rich-text.ts: plain data with `[links](/path)` and `**bold**`. It renders the pages and
    feeds the JSON-LD and llms-full.txt.
- **Safety and privacy on each game page,** from the manifest:
  - ages and contentNotes;
  - the new `safety` block (ads, purchases, chat, accounts and network, all required false;
    validated in scripts/lib/manifest.ts and docs/game.schema.json);
  - storage keys.
- **llms.txt and llms-full.txt:** generated per deployment from src/seo/llms.ts. The repo's
  llms.txt uses `PUBLIC_ORIGIN`; public/llms.txt is gone.
- **IndexNow:** key file `public/<INDEXNOW_KEY>.txt`. The release step after the production checks
  is `npm run indexnow --workspace apps/site`, which submits only pages whose words changed (tracked
  in indexnow-state.json; commit it with the record).
- **Art:** `scripts/art/icons.ts` builds the favicons, app icons, header mark and README wordmarks
  from docs/brand/*-source.webp. `scripts/art/og.ts` uses each game's real cover, including
  temporary art. Run icons.ts before og.ts.
- **Pitfall:** check the exit code of `npm run build`. Its `tsc` covers tests/, so a type error
  in a test stops the build, and a hidden failure leaves a stale dist/ that the e2e tests then pass
  against.

## Agentmon, the eighth game (release 2.5.0, after the owner's approval)

**1.1 (PR stacked on the 1.0 PR, not released):** game 1.1.0 with 77 Agentmon and pet care; the
listing says 77 and adds a pet-care feature line; the previews are recaptured from the 1.1 build
(the same capture routes, now with 1.1's art); STORAGE_AUDIT.md has the 1.1 sizes (no new keys).
The cover, logo and OG image are unchanged.

Listed from `games/agentmon/game.json`. Its genres are Adventure and RPG (RPG is new: its filter chip
and /category route come from the games). Art lives in `public/media/agentmon/`: a cover (the Field
Agent and the three partners above Saltwhistle at dusk, the Lighthouse Beacon lit), bob and twinkle
layers, a logo with "Agent" in gold and "mon" in Spark Ring pink (as on the game's title screen), and
the OG image. `scripts/art/og.ts` re-encodes every game's OG image; only `og/agentmon.jpg` was kept
(four others came out byte-different from the committed files, so they were restored untouched).
Previews come from `scripts/capture/agentmon.ts`, which uses the game's own `?scene=` capture routes
(`&play=1` plays the moment out). The battle, Spark Ring, Mood Match and Field Guide takes record the
tab, because their cards, text and panels are DOM; the town and the Trial record the canvas, and the
Trial take is cropped to the room. Loop 7.8 s.
Tests now count 8 games (age 7: LC, Space Sky, Tuck Pop, Agentmon); the grid is checked at 8 (unit and
browser); the launch tests start a new Agentmon adventure in slot 1 and continue it after a reload.

## Fieldlark, the ninth game (owner's "finish end to end" brief, 2026-10-14; PR, then the owner's approval)

Listed from `games/fieldlark/game.json` (1.0.0, "Ready to play", ages 8–14, Farming / Strategy / Cozy,
`site.order` 9: Shooberry's release stalled, and the owner chose to ship Fieldlark first, as site 2.10.0). Art in
`public/media/fieldlark/`: a generated cover (the cottage, fields of wheat, strawberries and cabbages,
the hen house, the river with the Little Lark at the dock), float (the lark) and twinkle layers, a logo
("Field" in white, "lark" in butter yellow, outlined green; `scripts/art/logos.ts`), and the OG image
(only `og/fieldlark.jpg` and the refreshed `og/site.jpg` are kept; `og/agentmon.jpg` came out
byte-different and was restored). Previews come from `scripts/capture/fieldlark.ts`: the game's own
`?scene=showcase` route (a staged late-game farm that never saves) with `&t=` for the season and hour
and `&x=&z=&zoom=` for the view; the canvas is recorded, so the HUD is left out. Loop 8.0 s (farm,
night, winter, town); stills add a greenhouse close-up. Pitfall: arrow-key pans are fast (about 6 tiles
a second, and the camera eases on after the key is up), so takes hold them for well under a second.
Its trailer is `marketing/sizzle/capture/games/fieldlark.ts` (longer takes, a real drag-to-harvest
and the animals up close); `npm run publish:trailers -- fieldlark` publishes one game's trailer and
keeps the others' as they are.
Tests now count 9 games (age 8: 7 games; age 10: 9; Farming: Cliff Valley and Fieldlark); the grid is
checked at 9 (3 × 3); the launch tests start a new farm ("Start farming", then the story cards) and
continue it after a reload ("Keep farming"). The storage audit adds `fieldlark.save`, `.save.bak`,
`.settings` and the rare `.save.broken` (worst case 346 KB, a finished story about 40 KB).

## Shooberry, the tenth game (release 2.11.0)

Listed from `games/shooberry/game.json` (Strategy and Casual, ages 7+, order 10, landscape, WebGL 2; built as 2.10.0, it ships after Fieldlark as
2.11.0). Art
in `public/media/shooberry/`: a cover (the meadow picnic: Rowan Flicker flicks a berry at the Snack Snail,
Comfrey Crumble, an Ant Column, the gingham blanket and basket) with `drift` (clouds) and `twinkle`
layers, a berry-red logo with the game's ink outline, and the OG image (`og.ts` also re-encoded
`og/agentmon.jpg` byte-different, so it was restored; `og/site.jpg` is refreshed). Previews come from
`scripts/capture/shooberry.ts`: the game's `?scene=` routes, all recorded from the canvas (the HUD is DOM
and hidden there); loop 7.8 s (wave, boss, dusk, cloud) and six stills. The trailer is in
`public/trailer/shooberry/`. Tests count 10 games (age 7: Light Crossing, Space Sky, Tuck Pop, Agentmon,
Shooberry; age 8: 8 games; age 10: 10; the grid at 10); the launch tests play Adventure level 1 (seeds, tips, a plant) and, after a
reload, check that level 1 remembers the seeds and skips the tips. `boot()` turns phones sideways for it,
as for the other landscape games.
Release 2.11.0 also gives the four games on temporary art (Cliff Valley, Vanex Defense, Space Sky,
Calex Cart) a gameplay loop from the builds that ship: `scripts/capture/<slug>.ts` reuses the trailer's
takes with `gallery: false` (loop and poster only; their screenshot covers and galleries stay), and
`loop: true` in `src/data/temporary-art.ts` turns the loop on (mediaFor, the registry, media tests).

## Breezeport, the city builder (owner's "Go, Breezeport", 2026-10-14; release 2.12.0 after Shooberry's 2.11.0)

Listed from `games/breezeport/game.json` (1.0.0, "Ready to play", ages 8–14, Simulation / Strategy,
`site.order` 11, after Shooberry's 10). Simulation is a new category (its filter chip and
/category route come from the games). Art in `public/media/breezeport/`: a cover (City Hall with its
clock, pastel clapboard houses and shops, the coral tram and the teal bus, the Ferris wheel, and the
striped lighthouse on its islet in the bay), drift (clouds and a sailboat) and twinkle layers, a logo
("Breeze" white, "port" coral, teal edge; `scripts/art/logos.ts`) and the OG image (only
`og/breezeport.jpg` and the refreshed `og/site.jpg` are kept; `og/agentmon.jpg` came out
byte-different again and was restored). Previews come from `scripts/capture/breezeport.ts`: the
game's own `?scene=showcase` route (a grown town built in code that never saves) with `&t=` for the
season and hour, `&festival=1` for the Bay Festival's night, `&map=` for a map and `&hud=0`; the
canvas is recorded, so the HUD is left out. Its trailer and 60-second reel takes are in
`marketing/sizzle/capture/games/breezeport.ts`. Tests count 11 games (age 8: 9 games; age 10: 11;
Simulation: Breezeport; the grid at 11); the launch tests start a new story town (Play, New town, Story,
"Become the mayor!", Marisol's lines) and continue it after a reload ("Continue <name>"). The storage
audit adds `breezeport.slot1`–`slot3`, `.bak`, `.settings` and the rare `.broken` (worst case 141 KB).

## Next: Light Crossing v2.0 (owner request, on hold)

Owner wants Light Crossing v2.0 imported and released. On 2026-10-11 its project was on
branch lightcrossing-upgrade (not main), had no v2.0.0 tag and had uncommitted changes, so
nothing was imported. Start only when it is on main at v2.0.0 with a clean tree.

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
