# Adding a game

The catalog drives discovery, favorites, details and play. It is generated from each game's
manifest, `games/<slug>/game.json`, by `npm run manifests` at the repo root (into
`src/data/games.generated.ts`; the `Game` type is in `src/data/games.ts`). Start a new game with
`npm run new-game -- <slug>` (see `docs/CREATE-A-GAME.md`).

## Trusted first-party games only

**WARNING: scripts plus same-origin access in an iframe do not isolate a game
from this site. Never add third-party games using this embedding setup.** A game
can access the site's DOM and every localStorage key on the origin. This is
acceptable only for our own reviewed first-party games. Do not accept arbitrary
game uploads.

Games by anyone else are **community games** (`community/<slug>/`, SUBMITTING.md and
MODERATION.md at the repo root). They are never imported here: the `ai-kids-games-play`
project (`apps/play`) builds them from source and serves each from its own address,
`aikg-<slug>.vercel.app`. That is a separate site, because `vercel.app` is on the Public
Suffix List. Its policy allows no connections, and only this website may frame it. The site
frames those addresses with the same sandbox and `allow` attributes; its CSP `frame-src` lists
exactly the approved games' addresses (`vite.config.ts`, from `scripts/generate-community.ts`).

The exact first-party permissions are:

```html
sandbox="allow-scripts allow-same-origin allow-pointer-lock"
allow="fullscreen; gamepad"
```

No top-navigation or pop-up permissions are granted. These attributes alone do
not prevent network requests or access to the host page. Review the complete
build, not just its registry description.

## Import and review

1. Build from the game's source in `games/<slug>`. Never edit compiled/minified HTML.
2. Audit every localStorage read/write, alias, probe, deletion and key enumeration.
   Use a game-specific namespace. No global clear(), or deletion of unowned keys.
   Stop integration on a collision or unsafe deletion; fix the source and rebuild.
3. Copy the self-contained final build into `public/games/<slug>/index.html`.
   `npm run import-game -- <slug>` (repo root) builds `games/<slug>` and copies it
   unchanged, verifies SHA-256 and records it, with a hash of the source, in BUILD_IMPORTS.json
   (`npm run check:builds` fails when a game's source changes without a re-import).
4. Remove placeholders and add the art in `public/media/<slug>/` (see "Cover art" below).
5. Add metadata in `games/<slug>/game.json` (schema: `docs/game.schema.json`), then run
   `npm run manifests`. The site's Game fields it fills: slug, title, tagline (the hero's one line),
   description (two short sentences for the details page), categories, tags, minAge,
   ageGuidance, contentNotes, estimatedPlayTime, quickStart (three short first steps),
   controls.types, controls.howToPlay (the exact full guidance, shown under "All
   controls"), supportedDevices, coverLayers, releaseDate, featured, accentColor,
   status. Do not blindly paste README keys. Art and previews are found by slug in
   `public/media/<slug>/`; the build fails if a ready game lacks them.
6. Run build, units and Playwright desktop/tablet/phone checks. Verify actual saves
   survive an iframe reload and other games/site lists survive each game's use
   and reset/delete actions. Test fullscreen, pointer lock, gamepad, first-tap
   audio and every advertised touch/device control.
7. Check network traffic: no remote scripts, fonts, ads, analytics or other-origin
   requests. No accounts, chat, uploads or user-generated content.
8. Deploy a Vercel preview; try real Safari/iPad and phone hardware. Production
   deployment requires the owner's explicit approval.

Saves remain in this browser. Handle unavailable storage without crashing, and
use clear in-game saving guidance. The site owns only `aikg:favorites` and
`aikg:recent`; legacy `aikidsgames.*` lists migrate automatically.

## Cover art, logo and Open Graph image

Each game owns its art files in `public/media/<slug>/`, so any one can be redone alone:

- `cover.svg`: a 1600×900 illustration in the site's shared style (flat shapes with soft
  facet shading, one subject in the lower middle, sky or background behind). Draw the
  real characters and places from the captured screenshots and the game's own colors.
  No title or text in the art. Keep the top 22% and the outer 6% on each side to
  background only: the age badge sits top left and the heart top right.
- `cover-<motion>.svg`: optional transparent layers, same viewBox, that the site
  animates slowly (`float`, `bob`, `twinkle`, `drift`; list them in `coverLayers`).
  They stop under reduced motion.
- `logo.svg`: the transparent title logo, outlined from Nunito Black. Add the game's
  style to `scripts/art/logos.ts` (colors from its title screen) and run
  `npx tsx scripts/art/logos.ts <slug>`.
- `public/og/<slug>.jpg`: 1200×630, made from the cover and logo by
  `npx tsx scripts/art/og.ts` (which also refreshes `public/og/site.jpg`).

`npx tsx scripts/art/render.ts <out-dir> [slug]` renders covers with the badge, heart and
safe-area guides for review. `npm test` checks every file exists and covers carry no text.

## Gameplay previews (loop, poster, screenshots)

Every game needs real gameplay previews. They are produced the same way for every game:

1. Write a capture route, `scripts/capture/<slug>.ts`, exporting a `Scenario`
   (see `scripts/capture/types.ts`). Each take has a `setup` (not recorded) that gets
   the game to just before a moment, and an `act` that plays it while recording.
   Call `ctx.cut()` when the best part starts (or `ctx.cut(-1)` to start a second
   earlier) and `ctx.still('alt text')` for gallery screenshots. Drive the game with
   its own production hooks, URL params and real UI/keys; never edit the build.
   `continues: true` keeps playing in the previous take's page (e.g. to reach a boss);
   `crop` zooms into part of the frame; `loopOrder` picks the loop order and poster.
   `gallery: false` records only the loop and poster, for a game on temporary art that keeps its
   own screenshots as the gallery (`loop: true` in `src/data/temporary-art.ts`).
2. Run `npm run capture-previews -- <slug>`. It serves `public/`, opens the game in
   full Chromium with the real GPU (Metal flags, 1920×1080, headed — headless gives no
   smooth capture) and records each take from the game canvas at 60 fps, so DOM
   HUDs and menus are left out (`source: 'tab'` records the page, for DOM moments).
   Keep the capture window uncovered; stalled takes are retried automatically.
   `--only=<take>` reruns one take (plus earlier takes in its chain), `--encode-only`
   re-encodes from the raw takes in `captures/` (git-ignored), `--headless` exists for
   debugging only.
3. The encoder (ffmpeg-static + sharp) writes `public/media/<slug>/`: a seamless 3–4
   moment loop (`loop.mp4` H.264 and `loop.webm` VP9, 960×540, 30 fps, 6–8 s, each
   under 800 KB), `poster.{avif,webp,jpg}` (the loop's first frame, 1280×720) and
   4–6 `shot-N.{avif,webp,jpg}` (1600×900) with `-thumb` versions (640×360). Alt
   text and sizes go into `src/data/media.json`.
4. Review a contact sheet of the loop and every still before committing. `npm test`
   fails if a game lacks previews, a file is missing, or a loop is over budget.

`npx tsx scripts/capture/probe.ts <slug> <query|-> <script.js> [shot.png]` runs a
small script against a game page while you work out a route.

## Scaffolding and categories

`npm run new-game -- <slug>` (repo root) scaffolds a new game from `templates/game-starter`.
Replace its placeholder art and HTML before launch. Launch categories: Action,
Adventure, Cozy, Strategy, Racing, Learning. New categories need the Category type
and scaffolder choices updated. The home page shows one balanced "All games" grid;
per-category rows appear automatically once there are 12 or more games
(`CATEGORY_ROWS_FROM` in src/pages/Home.tsx). Browse compares a game's numeric
minAge with the selected player age; ageGuidance is the display recommendation.

## Caching and hosting

Preserve game HTML revalidation in vercel.json: the filenames are always
index.html, so never mark them immutable. Hashed Vite assets may be immutable.
Serve existing game files before the SPA fallback. Set SITE_ORIGIN for a custom
production domain; Vercel previews use VERCEL_URL for generated metadata.
