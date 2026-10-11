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
