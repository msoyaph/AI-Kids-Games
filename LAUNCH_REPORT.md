# Ai Kids Games launch report — 2026-10-11

## Changes

- Imported all five finished game builds unchanged. Source/public/dist SHA-256
  hashes match; every game directory contains only index.html. BUILD_IMPORTS.json
  records source paths, sizes and hashes. No original game project was edited.
- Copied Vanex Defense, Space Sky and Calex Cart art; drew original 16:9 banners
  and square thumbnails for TheaBonk and Light Crossing. Reviewed rendered art.
- Reconciled registry fields and controls; all five games appear in Home, Browse,
  categories, details and play. Finished Light Crossing replaces its old preview.
  Added Strategy, Racing, Learning and numeric minimum-age filtering.
- TheaBonk remains computer-only. Calex split-screen requires keyboard/gamepads;
  its touch controls are for solo play. Detail and parent copy explain saves.
- The play iframe has the required sandbox/fullscreen/gamepad permissions and
  loading overlay. No changes were inserted into game HTML.
- Migrated existing catalog lists to aikg: keys, merging valid data and preserving
  legacy data if migration writes fail. Clear saved lists leaves game saves alone.
- Documented first-party trust and the required separate domain for third-party
  games; removed obsolete adapted sources and preview/memory-save claims.
- Game HTML and unhashed artwork revalidate on each visit; hashed site assets are
  immutable for a year. Vercel caches static deployment outputs at its edge.
- Added a production approval guard to prevent an accidental first-deploy
  promotion by Vercel. A preview-only build must report VERCEL_ENV=preview.

## Storage

STORAGE_AUDIT.md contains the full persistent and probe key table, source/built
operation review, scoped deletion details and legacy migration behavior.
No colliding keys, localStorage.clear(), or removal of unowned keys were found.
Calex enumerates keys only to select its own slot's ghost prefix. There are no
required storage changes in the original game projects.

## Automated verification

Status: all local checks passed. 47 applicable Playwright cases passed across
desktop, tablet and phone; 16 device-specific cases are intentionally skipped.
The suite was completed across targeted runs after correcting test orientation
and waiting for Space Sky's scene transition. No game build needed modification.

- Production build passes registry validation, TypeScript, Vite and metadata shells.
- 20 Vitest units pass, including minimum-age filtering and migration/quota cases.
- Checks passed on all three viewports for all five games: home/details/play, first real gesture
  audio context running, 20 seconds without game/site errors or other-origin
  requests, save/settings persisted and loaded after iframe navigation/reload.
- TheaBonk pointer lock worked; each advertised gamepad integration responded to
  a simulated standard controller. Vanex does not advertise gamepad controls.
- Sequential opening/playing all five preserved every favorite, recent history
  and preceding game's save. Clearing site lists left the game saves untouched.
- Native touch events moved Light Crossing's islander and Space Sky's ship on
  tablet and phone, built a Vanex tower, and drove Calex with steering, drift,
  brake and item controls. Space Sky and Calex require landscape for touch play.
- Slow download: 40 KiB/s throughput, 200 ms latency, cache disabled. Loading
  remained visible while downloading, disappeared at load and the game opened.
- Deployment guard rejects production and unknown preview-only environments;
  allows preview. Physical gamepads and native Safari/iPad are not simulated by
  Chromium viewport tests and need the checks below.

## Real iPad (Safari) and phone checklist

Use the same preview URL for every check; saves are tied to the browser and origin.
Use normal browsing with storage enabled. Preview and production hosts have
separate saves; lists on the old Sites domain cannot automatically transfer.

1. Browse all five games; check age filtering, details and TheaBonk's computer
   notice on a phone. Check the Calex split-screen explanation.
2. In Light Crossing, create a slot, move/interact with touch, save and reload.
   Confirm the slot returns without a saving-unavailable warning.
3. In Vanex, build a tower with touch and send a wave. Change a setting, reload
   and verify it remains. In Space Sky, create a cadet, visit the Hangar, reload
   and continue; use the flight joystick/boost/action controls.
4. In Calex, create a slot and drive with touch/tilt, drift and use an item. Reload
   and continue that slot. Test landscape/portrait changes and pause/resume.
5. With sound enabled, verify each game's first tap starts audio. Background the
   browser and return; check pause/resume and sound restoration.
6. Try fullscreen where Safari offers it; unsupported browsers should retain a
   usable play view. Test TheaBonk on a computer with mouse lock, and a physical
   controller for each game that advertises gamepad support. Calex split-screen
   should be checked with keyboard or gamepads.
7. Favorite all five; open them one after another; reload the catalog and confirm
   favorites/recent history and game slots remain. Clear only catalog lists and
   confirm game progress remains. Use a slow connection to check loading feedback.

## Deployment

Current preview: https://ai-kids-games-m7zdjkpiq-real-tours.vercel.app

Vercel project: real-tours/ai-kids-games. Deployment
`dpl_Djvq2uCxFAQ1mSPapjikTQUUhD5R` is READY and is a preview (API target=null,
CLI Preview, build VERCEL_ENV=preview). DEPLOYMENT.json records this identity.
Vercel authentication is still enabled; sign in with the owner/team account on
real devices. The site itself makes no other-origin runtime requests. The host
sign-in flow is separate from game/site runtime verification.

The initial explicit preview attempt was assigned to production by Vercel. The
preview-only build guard stopped it before any site output was published. Its
state is ERROR, not a successful production release. Keeping that failed attempt
allowed the next explicit preview attempt to succeed. This is Vercel's documented
[first-deploy behavior](https://github.com/vercel/vercel/pull/17206).

All five hosted game responses match their original source bytes. Each responds
with `Cache-Control: public, max-age=0, must-revalidate` and a valid ETag;
conditional requests return 304. Hashed site assets use
`public, max-age=31536000, immutable`. All five direct detail routes serve their
own metadata. The injected Vercel toolbar is disabled for this project.

Final hosted Playwright pass: 13/13 desktop checks passed, including all five
20-second game runs and save reloads, sequential storage preservation, fullscreen,
age/category filtering and existing catalog tests. No game/site errors or
other-origin runtime requests. Temporary authenticated automation access was
revoked after QA; access cookies are never shipped.

Production is not authorized and has not been published. The existing Sites
version received only the separately requested homepage copy removal; its
two-game catalog remains. After real-device checks, request owner approval before
any production deployment or promotion.

## Homepage review follow-up

Removed the welcome strip, hero badge and selected section subtitles in both
the older Sites page and the five-game Vercel preview. Build and 15 catalog
browser checks pass across desktop, tablet and phone. Both versions pass
phrase-removal and layout checks at 855 and 390 pixels. The full 13 hosted
integration checks above apply to the original launch preview; game builds
and embedding/storage behavior are unchanged by this presentation edit.
