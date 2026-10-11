# Adding a game

The typed catalog in `src/data/games.ts` drives discovery, favorites, details and play.

## Trusted first-party games only

**WARNING: scripts plus same-origin access in an iframe do not isolate a game
from this site. Never add third-party games using this embedding setup.** A game
can access the site's DOM and every localStorage key on the origin. This is
acceptable only for our own reviewed first-party games. Third-party games would
need to be served from a separate domain with a separately reviewed sandbox,
storage and permissions policy. Do not accept arbitrary game uploads.

The exact first-party permissions are:

```html
sandbox="allow-scripts allow-same-origin allow-pointer-lock"
allow="fullscreen; gamepad"
```

No top-navigation or pop-up permissions are granted. These attributes alone do
not prevent network requests or access to the host page. Review the complete
build, not just its registry description.

## Import and review

1. Build in the original game source project. Do not edit compiled/minified HTML.
2. Audit every localStorage read/write, alias, probe, deletion and key enumeration.
   Use a game-specific namespace. No global clear(), or deletion of unowned keys.
   Stop integration on a collision or unsafe deletion; fix the source and rebuild.
3. Copy the self-contained final build into `public/games/<slug>/index.html`.
   `npx tsx scripts/import-game-build.ts <slug> <source-index.html>` copies it
   unchanged and verifies SHA-256. Keep BUILD_IMPORTS.json current.
4. Remove placeholders. Copy a square thumbnail and a 16:9 banner to `public/art/`.
5. Add metadata using Game's actual fields: slug, title, tagline, description,
   categories, tags, minAge, ageGuidance, contentNotes, estimatedPlayTime,
   controls.types, controls.howToPlay, supportedDevices, thumbnail, banner,
   releaseDate, featured, accentColor, status. Do not blindly paste README keys.
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

`npm run add-game` makes a Coming soon placeholder without overwriting a slug.
Replace its art and HTML before launch. Launch categories: Action, Adventure,
Cozy, Strategy, Racing, Learning. New categories need the Category type,
Home icon map and scaffolder choices updated. Browse compares a game's numeric
minAge with the selected player age; ageGuidance is the display recommendation.

## Caching and hosting

Preserve game HTML revalidation in vercel.json: the filenames are always
index.html, so never mark them immutable. Hashed Vite assets may be immutable.
Serve existing game files before the SPA fallback. Set SITE_ORIGIN for a custom
production domain; Vercel previews use VERCEL_URL for generated metadata.
