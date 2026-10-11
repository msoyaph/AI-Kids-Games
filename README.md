# Ai Kids Games

A static, kid-friendly catalog for TheaBonk and the Light Crossing island preview.
Published privately with Sites at https://ai-kids-games.real-tours-1786.chatgpt.site/.

## What is included

- Original mascot/wordmark and local SVG game illustrations.
- Responsive home with rotating featured games, category rows, new games,
  device-local favorites, and recently played.
- Search, category pages, game details, and sandboxed fullscreen play views.
- Phone navigation, computer-only game notice, light/dark mode, visible focus
  rings, reduced motion support, parent information, About, and a friendly 404.
- Typed registry and build-time validation. Interactive game scaffolder.
- Route code splitting, lazy thumbnails, page titles/descriptions, Open Graph
  metadata, favicon, and a web app manifest.

## Run locally

Requires a modern Node.js release supported by the locked dependencies.

```sh
npm ci
npm run dev
npm run build
npm run preview
npm test
npm run test:e2e
```

Dev: http://127.0.0.1:5190. Preview: http://127.0.0.1:4190.
Playwright uses Google Chrome on macOS when installed. Else install its browser
once with `npx playwright install chromium`. Tests use the production build;
run `npm run build` first.

## Structure

```text
src/
  components/    Header, footer, cards, rows, icons, outbound-link dialog
  data/games.ts  All typed game metadata
  lib/           Registry checks, search, safe device-local lists, page metadata
  pages/         Lazy-loaded routes
  styles.css     Design tokens and responsive layout
public/
  games/<slug>/index.html    Self-contained real game builds
  art/                      Original SVG thumbnails/banners
scripts/                    Registry validation, add-game, game import helper
tests/                      Vitest units and Playwright desktop/phone smoke tests
game-sources/               Adapted source copies of the supplied games
.openai/hosting.json        Sites identity and static dist configuration
```

## Add a game

Put its build under `public/games/<slug>/index.html`, add an entry to
`src/data/games.ts`, and add local artwork. Or run `npm run add-game` to scaffold
all three interactively. See `ADDING_A_GAME.md` for metadata and game review.

## Privacy and hosting

The catalog has no backend, accounts, chat, uploads, ads, analytics, cookies,
tracking, or third-party network scripts. All libraries are compiled into local
files. Browser requests load the site and game assets from the same origin.
The only persistent app data is favorites/recent lists in localStorage, guarded
against blocked or malformed storage. Theme and game progress are visit-only.
Games have an inline security policy blocking network requests and use the
requested sandbox permissions. Publish only reviewed, trusted game builds.

Sites publication is owner-private by default. The hosting service may require
the owner's ChatGPT sign-in and has its own service policies. This is separate
from the catalog's account-free design. No public sharing was enabled.

## Launch-game limitations

Light Crossing's supplied project is an early island exploration preview. The
site labels it accordingly; fishing, bug catching, crafting, villagers, and story
are not connected in that build. On-screen directional controls were added to
the hosted copy so its existing movement input works on phones/tablets.

TheaBonk is a playable 3D action roguelite. Its hosted copy uses memory saves and
disables default screen shake for reduced-motion visitors. It is listed for
computers; a keyboard/mouse or gamepad is needed. 3D games require WebGL; frame
rate depends on the device. Fullscreen support depends on the browser. Physical
gamepad hardware was not available for verification.

Illustrations are original promotional artwork, not gameplay screenshots.
Builds generate static HTML shells with per-page metadata for every known route,
plus a sitemap and friendly 404 shell. Titles and descriptions also update when
visitors navigate in the browser. Search queries and favorites remain local.

## Rebuild a launch game

The `game-sources/` copies retain the original source and package lockfiles,
with only the marketplace adaptations described above. Originals were not edited.
Install and build in the game's source folder, then import its single HTML build:

```sh
cd game-sources/theabonk
npm ci
npm run build
cd ../..
npx tsx scripts/import-game-build.ts theabonk game-sources/theabonk/dist/index.html
npm run build
```

Use `light-crossing` instead for the other game. The import helper restores the
inline security policy. It does not review a new game's privacy or code.

## Deployment on Vercel

1. Put this source folder into a Git repository and import it as a Vercel project.
2. Choose the Vite preset. Build command: `npm run build`. Output: `dist`.
3. Keep the included `vercel.json`; it serves existing files and generated page
   shells first, then falls back to `index.html` for unknown browser paths.
4. Deploy, then verify a direct `/game/theabonk` visit and both iframe games.
5. Update the absolute origin in `index.html`, `src/lib/meta.ts`, and
   `scripts/generate-route-shells.ts` for your domain.
6. Leave Vercel Web Analytics and Speed Insights disabled to keep the no-tracking
   promise. No environment secrets or backend are required.

Official guidance: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
and [rewrites](https://vercel.com/docs/routing/rewrites).

Netlify can use the supplied `public/_redirects`; deploy the `dist` folder.
For any other static host, serve existing files first, then fall back to
`index.html` for browser routes. A catch-all rewrite must never replace a game
HTML response with the catalog shell.

## Validation

See `VERIFICATION.md` for final checks and local Lighthouse results.
